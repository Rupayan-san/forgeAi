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
            total_chunks = 0

            # 3. Ingest Repository Overview
            try:
                print(f"Ingesting repository overview for {repo_name}...")
                overview_text = (
                    f"Repository Overview: {repo.full_name}\n"
                    f"Description: {repo.description or 'No description provided'}\n"
                    f"Default Branch: {repo.default_branch}\n"
                    f"Primary Language: {repo.language or 'Various'}\n"
                    f"Stars: {repo.stargazers_count}, Forks: {repo.forks_count}, Open Issues: {repo.open_issues_count}\n"
                    f"Created At: {repo.created_at.isoformat() if repo.created_at else ''}\n"
                    f"Last Push: {repo.pushed_at.isoformat() if repo.pushed_at else ''}\n"
                )
                metadata = {
                    "project_id": self.project_id,
                    "url": repo.html_url,
                }
                overview_points = await self.embedding_service.chunk_and_embed(
                    text=overview_text,
                    source_type="readme",
                    source_id="repo_overview",
                    metadata=metadata
                )
                if overview_points:
                    await qdrant_service.upsert_points(collection_name, overview_points)
                    total_chunks += len(overview_points)
            except Exception as e:
                print(f"Error fetching repo overview for {repo_name}: {e}")

            # 4. Ingest Git Commits (Latest 30 commits)
            print(f"Fetching recent commits for {repo_name}...")
            try:
                commit_count = 0
                for commit in repo.get_commits():
                    commit_sha = commit.sha[:7]
                    author_name = commit.author.login if commit.author else (commit.commit.author.name if commit.commit.author else "Unknown")
                    commit_date = commit.commit.author.date.isoformat() if commit.commit.author and commit.commit.author.date else "Unknown date"
                    commit_msg = commit.commit.message
                    files_modified = [f.filename for f in (commit.files or [])[:10]]
                    
                    commit_text = (
                        f"Commit SHA: {commit_sha} ({commit.sha})\n"
                        f"Author: {author_name}\n"
                        f"Date: {commit_date}\n"
                        f"Commit Message: {commit_msg}\n"
                        f"Modified Files: {', '.join(files_modified) if files_modified else 'None recorded'}"
                    )
                    
                    metadata = {
                        "project_id": self.project_id,
                        "commit_sha": commit.sha,
                        "author": author_name,
                        "date": commit_date,
                        "url": commit.html_url,
                    }
                    
                    commit_points = await self.embedding_service.chunk_and_embed(
                        text=commit_text,
                        source_type="commit",
                        source_id=f"commit_{commit_sha}",
                        metadata=metadata
                    )
                    if commit_points:
                        await qdrant_service.upsert_points(collection_name, commit_points)
                        total_chunks += len(commit_points)
                    
                    commit_count += 1
                    if commit_count >= 30:
                        break
                print(f"Ingested {commit_count} commits.")
            except Exception as e:
                print(f"Error fetching commits for {repo_name}: {e}")

            # 5. Ingest Pull Requests
            print(f"Fetching recent pull requests for {repo_name}...")
            try:
                pr_count = 0
                for pr in repo.get_pulls(state="all", sort="created", direction="desc"):
                    pr_author = pr.user.login if pr.user else "Unknown"
                    pr_created = pr.created_at.isoformat() if pr.created_at else ""
                    pr_merged = pr.merged_at.isoformat() if pr.merged_at else "Not merged"
                    pr_body = pr.body or "No description provided"
                    
                    pr_text = (
                        f"Pull Request #{pr.number}: {pr.title}\n"
                        f"State: {pr.state} (Merged: {pr.is_merged()})\n"
                        f"Author: {pr_author}\n"
                        f"Created: {pr_created}\n"
                        f"Merged At: {pr_merged}\n"
                        f"Description:\n{pr_body[:1200]}"
                    )
                    
                    metadata = {
                        "project_id": self.project_id,
                        "pr_number": pr.number,
                        "author": pr_author,
                        "url": pr.html_url,
                    }
                    
                    pr_points = await self.embedding_service.chunk_and_embed(
                        text=pr_text,
                        source_type="pr",
                        source_id=f"pr_{pr.number}",
                        metadata=metadata
                    )
                    if pr_points:
                        await qdrant_service.upsert_points(collection_name, pr_points)
                        total_chunks += len(pr_points)
                    
                    pr_count += 1
                    if pr_count >= 20:
                        break
                print(f"Ingested {pr_count} pull requests.")
            except Exception as e:
                print(f"Error fetching PRs for {repo_name}: {e}")

            # 6. Ingest Issues
            print(f"Fetching recent issues for {repo_name}...")
            try:
                issue_count = 0
                for issue in repo.get_issues(state="all", sort="created", direction="desc"):
                    if issue.pull_request:
                        continue
                    issue_author = issue.user.login if issue.user else "Unknown"
                    issue_created = issue.created_at.isoformat() if issue.created_at else ""
                    issue_body = issue.body or "No description provided"
                    labels = [l.name for l in issue.labels]
                    
                    issue_text = (
                        f"Issue #{issue.number}: {issue.title}\n"
                        f"State: {issue.state}\n"
                        f"Author: {issue_author}\n"
                        f"Created: {issue_created}\n"
                        f"Labels: {', '.join(labels) if labels else 'None'}\n"
                        f"Description:\n{issue_body[:1200]}"
                    )
                    
                    metadata = {
                        "project_id": self.project_id,
                        "issue_number": issue.number,
                        "author": issue_author,
                        "url": issue.html_url,
                    }
                    
                    issue_points = await self.embedding_service.chunk_and_embed(
                        text=issue_text,
                        source_type="issue",
                        source_id=f"issue_{issue.number}",
                        metadata=metadata
                    )
                    if issue_points:
                        await qdrant_service.upsert_points(collection_name, issue_points)
                        total_chunks += len(issue_points)
                        issue_count += 1
                        
                    if issue_count >= 20:
                        break
                print(f"Ingested {issue_count} issues.")
            except Exception as e:
                print(f"Error fetching issues for {repo_name}: {e}")

            # 7. Fetch and process files
            contents = repo.get_contents("")
            files_to_process = []
            while contents:
                file_content = contents.pop(0)
                if file_content.type == "dir":
                    contents.extend(repo.get_contents(file_content.path))
                else:
                    if not self._should_ignore(file_content.path):
                        files_to_process.append(file_content)

            for file_content in files_to_process:
                print(f"Processing {file_content.path}...")
                try:
                    if file_content.encoding == "base64":
                        decoded_content = base64.b64decode(file_content.content).decode("utf-8", errors="replace")
                    else:
                        decoded_content = file_content.decoded_content.decode("utf-8", errors="replace")
                        
                    metadata = {
                        "project_id": self.project_id,
                        "file_path": file_content.path,
                        "url": file_content.html_url,
                    }
                    
                    # Generate points for code chunks
                    points = await self.embedding_service.chunk_and_embed(
                        text=decoded_content,
                        source_type="github_file",
                        source_id=file_content.path,
                        metadata=metadata
                    )
                    
                    if points:
                        await qdrant_service.upsert_points(collection_name, points)
                        total_chunks += len(points)
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
