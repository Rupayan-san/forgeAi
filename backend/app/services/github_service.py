import asyncio
from datetime import datetime, timezone
import base64
from typing import Any

from github import Github, Auth
from github.Repository import Repository

from app.core.config import settings
from app.core.database import get_db, get_qdrant
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.models.project import ProjectModel


class GitHubIngestionService:
    def __init__(self, project_id: str, access_token: str):
        self.project_id = project_id
        auth = Auth.Token(access_token)
        self.gh = Github(auth=auth)
        self.embedding_service = EmbeddingService()
        
    async def _update_status(self, db, status_update: dict):
        """Update the ingestion status in MongoDB."""
        await db["projects"].update_one(
            {"project_id": self.project_id},
            {"$set": status_update}
        )

    async def _generate_summary(self, file_path: str, content: str) -> str:
        """Use gpt-4o-mini to get a 2-sentence summary of the file."""
        # Only summarize source files and docs, skip extremely short ones
        if len(content.strip()) < 100:
            return ""
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a software architect summarizing code files. Respond in exactly 1 or 2 concise sentences describing what this file does in the system."},
                    {"role": "user", "content": f"File: {file_path}\n\nContent:\n{content[:1500]}"}
                ],
                temperature=0.3,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Failed summary generation for {file_path}: {e}")
            return ""

    def _should_ignore(self, file_path: str) -> bool:
        """Filter out binary, lockfiles, and irrelevant directories."""
        ignored_extensions = {
            ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
            ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
            ".woff", ".woff2", ".ttf", ".eot",
            ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".class",
            ".log", ".lock"
        }
        ignored_files = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock"}
        ignored_dirs = {"node_modules", ".git", "venv", "__pycache__", "dist", "build", ".next", ".vscode", ".idea"}

        parts = file_path.split("/")
        # Check directories
        for part in parts[:-1]:
            if part in ignored_dirs or part.startswith("."):
                return True
        
        filename = parts[-1]
        if filename in ignored_files:
            return True
            
        ext = filename[filename.rfind("."):] if "." in filename else ""
        if ext.lower() in ignored_extensions:
            return True
            
        return False

    async def ingest_repository(self):
        """Main entry point for the RQ worker."""
        # Note: RQ jobs run synchronously, so this async function will be called via asyncio.run()
        print(f"Starting GitHub ingestion for project {self.project_id}...")
        
        # Get DB clients (manually since we aren't in FastAPI lifecycle)
        from motor.motor_asyncio import AsyncIOMotorClient
        from qdrant_client import AsyncQdrantClient
        
        db_client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = db_client[settings.MONGODB_DB_NAME]
        
        qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
        qdrant_service = QdrantService(qdrant)
        
        try:
            # 1. Fetch project info
            project_doc = await db["projects"].find_one({"project_id": self.project_id})
            if not project_doc:
                print(f"Project {self.project_id} not found.")
                return
                
            project = ProjectModel(**project_doc)
            if not project.github_repo_name:
                print(f"Project {self.project_id} has no GitHub repo configured.")
                return

            await self._update_status(db, {
                "ingestion_status.github_backfill_complete": False,
                "ingestion_status.last_github_sync": datetime.now(timezone.utc).isoformat()
            })

            # 2. Ensure Qdrant collection exists
            collection_name = project.qdrant_collection_name
            await qdrant_service.ensure_collection(collection_name)

            # 3. Fetch repo contents
            repo_name = project.github_repo_name.strip()
            if repo_name.endswith(".git"):
                repo_name = repo_name[:-4]
            repo: Repository = self.gh.get_repo(repo_name)
            contents = repo.get_contents("")
            
            files_to_process = []
            while contents:
                file_content = contents.pop(0)
                if file_content.type == "dir":
                    contents.extend(repo.get_contents(file_content.path))
                else:
                    if not self._should_ignore(file_content.path):
                        files_to_process.append(file_content)

            # 4. Process files and generate embeddings
            total_chunks = 0
            for file_content in files_to_process:
                print(f"Processing {file_content.path}...")
                try:
                    # Content is usually base64 encoded by GitHub API
                    if file_content.encoding == "base64":
                        decoded_content = base64.b64decode(file_content.content).decode("utf-8")
                    else:
                        decoded_content = file_content.decoded_content.decode("utf-8")
                        
                    metadata = {
                        "project_id": self.project_id,
                        "file_path": file_content.path,
                        "url": file_content.html_url,
                    }
                    
                    # Generate points
                    points = await self.embedding_service.chunk_and_embed(
                        text=decoded_content,
                        source_type="github_file",
                        source_id=file_content.path,
                        metadata=metadata
                    )
                    
                    if points:
                        await qdrant_service.upsert_points(collection_name, points)
                        total_chunks += len(points)
                        
                    # Generate and embed summary
                    summary = await self._generate_summary(file_content.path, decoded_content)
                    if summary:
                        summary_points = await self.embedding_service.chunk_and_embed(
                            text=summary,
                            source_type="file_summary",
                            source_id=f"{file_content.path}_summary",
                            metadata=metadata
                        )
                        if summary_points:
                            await qdrant_service.upsert_points(collection_name, summary_points)
                            total_chunks += len(summary_points)
                        
                except Exception as e:
                    print(f"Error processing file {file_content.path}: {e}")

            # 5. Update success status
            await self._update_status(db, {
                "ingestion_status.github_backfill_complete": True,
                "ingestion_status.github_chunks_count": total_chunks,
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"Successfully ingested {total_chunks} chunks for {project.github_repo_name}")

        except Exception as e:
            print(f"Fatal error during ingestion: {e}")
            await self._update_status(db, {
                "ingestion_status.github_backfill_complete": False,
            })
        finally:
            db_client.close()


def run_github_ingestion(project_id: str, access_token: str):
    """Synchronous wrapper for RQ to execute the async ingestion process."""
    service = GitHubIngestionService(project_id, access_token)
    asyncio.run(service.ingest_repository())
