import asyncio
from datetime import datetime, timezone
import io
import zipfile
from typing import Any, Optional

import httpx
from github import Github, Auth, GithubException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.services.embedding_service import EmbeddingService
from app.services.qdrant_service import QdrantService
from app.services.memory_service import ProjectMemoryService
from app.models.project import ProjectModel


class GitHubIngestionService:
    """Service handling GitHub Repository, Commits, Pull Requests ingestion, and webhooks."""

    def __init__(self, project_id: str, access_token: str = ""):
        self.project_id = project_id
        self.access_token = (access_token or "").strip()
        self.embedding_service = EmbeddingService()
        self.memory_service = ProjectMemoryService()

    async def _update_status(self, db, status_update: dict):
        """Update the ingestion status in MongoDB."""
        await db["projects"].update_one(
            {"project_id": self.project_id},
            {"$set": status_update},
        )

    def _normalize_repo_name(self, raw_repo_name: str) -> str:
        """Extract clean owner/repo from URL or string."""
        repo_name = raw_repo_name.strip()
        if "github.com/" in repo_name:
            repo_name = repo_name.split("github.com/")[-1].strip("/")
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]
        return repo_name

    def _get_active_token(self) -> Optional[str]:
        """Return user token or system fallback token."""
        if self.access_token:
            return self.access_token
        env_token = getattr(settings, "GITHUB_TOKEN", "") or getattr(settings, "GITHUB_PERSONAL_ACCESS_TOKEN", "")
        return env_token.strip() if env_token else None

    def _get_headers(self) -> dict[str, str]:
        """Build standard GitHub API request headers."""
        token = self._get_active_token()
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "ForgeAI-Ingestion-Engine",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def _download_repo_archive(self, repo_name: str, branch: str = "main") -> tuple[bytes, str]:
        """Download the repository zipball in ONE single HTTP request without consuming REST API rate limits."""
        headers = self._get_headers()

        # 1. Try GitHub API zipball endpoint
        api_zip_url = f"https://api.github.com/repos/{repo_name}/zipball/{branch}"
        async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
            try:
                res = await client.get(api_zip_url, headers=headers)
                if res.status_code == 200 and len(res.content) > 0:
                    print(f"[GitHub Ingestion] Downloaded zip archive via API for {repo_name} ({len(res.content)} bytes)")
                    return res.content, "api_zipball"
            except Exception as e:
                print(f"[GitHub Ingestion] API zipball fetch failed: {e}")

            # 2. Try direct public archive branches
            for target_branch in [branch, "main", "master"]:
                public_zip_url = f"https://github.com/{repo_name}/archive/refs/heads/{target_branch}.zip"
                try:
                    res = await client.get(public_zip_url, headers={"User-Agent": "ForgeAI-Ingestion-Engine"})
                    if res.status_code == 200 and len(res.content) > 0:
                        print(f"[GitHub Ingestion] Downloaded public archive for {repo_name} on branch '{target_branch}' ({len(res.content)} bytes)")
                        return res.content, f"public_archive_{target_branch}"
                except Exception as e:
                    print(f"[GitHub Ingestion] Public archive fetch failed for branch '{target_branch}': {e}")

        raise RuntimeError(
            f"Failed to download repository archive for '{repo_name}'. "
            f"Please verify repository name and access permissions."
        )

    async def _ingest_commits(
        self, repo_name: str, collection_name: str, limit: int = 25
    ) -> tuple[int, Optional[str]]:
        """Fetch and index recent commit history."""
        headers = self._get_headers()
        url = f"https://api.github.com/repos/{repo_name}/commits?per_page={limit}"
        latest_sha = None
        indexed_count = 0

        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    print(f"[GitHub Commits] Commits API returned {res.status_code}")
                    return 0, None

                commits_data = res.json()
                if not isinstance(commits_data, list):
                    return 0, None

                for item in commits_data:
                    sha = item.get("sha", "")
                    if not latest_sha:
                        latest_sha = sha

                    commit_info = item.get("commit", {})
                    author_info = commit_info.get("author", {})
                    author_name = author_info.get("name", "Unknown")
                    date_str = author_info.get("date", "")
                    message = commit_info.get("message", "").strip()

                    text = f"GitHub Commit ({sha[:7]}) by {author_name} on {date_str}:\n{message}"
                    metadata = {
                        "project_id": self.project_id,
                        "repository": repo_name,
                        "commit_sha": sha,
                        "author": author_name,
                        "date": date_str,
                        "url": item.get("html_url", f"https://github.com/{repo_name}/commit/{sha}"),
                    }

                    points = await self.embedding_service.chunk_and_embed(
                        text=text,
                        source_type="github_commit",
                        source_id=sha,
                        metadata=metadata,
                    )
                    if points:
                        from app.core.database import get_qdrant
                        qdrant = get_qdrant()
                        qdrant_service = QdrantService(qdrant)
                        await qdrant_service.upsert_points(collection_name, points)
                        indexed_count += len(points)

                print(f"[GitHub Commits] Indexed {indexed_count} chunks from {len(commits_data)} commits in {repo_name}")
                return indexed_count, latest_sha

            except Exception as e:
                print(f"[GitHub Commits] Failed to ingest commits for {repo_name}: {e}")
                return 0, None

    async def _ingest_pull_requests(
        self, repo_name: str, collection_name: str, limit: int = 20
    ) -> int:
        """Fetch and index recent Pull Requests."""
        headers = self._get_headers()
        url = f"https://api.github.com/repos/{repo_name}/pulls?state=all&per_page={limit}"
        indexed_count = 0

        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            try:
                res = await client.get(url, headers=headers)
                if res.status_code != 200:
                    print(f"[GitHub PRs] PR API returned {res.status_code}")
                    return 0

                prs_data = res.json()
                if not isinstance(prs_data, list):
                    return 0

                for pr in prs_data:
                    pr_number = pr.get("number")
                    title = pr.get("title", "")
                    body = pr.get("body", "") or ""
                    state = pr.get("state", "open")
                    user = pr.get("user", {}).get("login", "unknown")
                    created_at = pr.get("created_at", "")
                    merged_at = pr.get("merged_at")
                    html_url = pr.get("html_url", f"https://github.com/{repo_name}/pull/{pr_number}")

                    text = f"Pull Request #{pr_number} [{state.upper()}] by @{user}: {title}\nCreated: {created_at}\nMerged: {merged_at or 'N/A'}\n\nDescription:\n{body[:1000]}"
                    metadata = {
                        "project_id": self.project_id,
                        "repository": repo_name,
                        "pr_number": pr_number,
                        "state": state,
                        "author": user,
                        "created_at": created_at,
                        "url": html_url,
                    }

                    points = await self.embedding_service.chunk_and_embed(
                        text=text,
                        source_type="github_pr",
                        source_id=f"pr_{pr_number}",
                        metadata=metadata,
                    )
                    if points:
                        from app.core.database import get_qdrant
                        qdrant = get_qdrant()
                        qdrant_service = QdrantService(qdrant)
                        await qdrant_service.upsert_points(collection_name, points)
                        indexed_count += len(points)

                print(f"[GitHub PRs] Indexed {indexed_count} chunks from {len(prs_data)} PRs in {repo_name}")
                return indexed_count

            except Exception as e:
                print(f"[GitHub PRs] Failed to ingest PRs for {repo_name}: {e}")
                return 0

    async def _generate_summary(self, file_path: str, content: str) -> str:
        """Use gpt-4o-mini to get a 2-sentence summary of meaningful source files."""
        if len(content.strip()) < 100:
            return ""

        summarizable_extensions = {
            ".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".java", ".cpp", ".c",
            ".cs", ".rb", ".php", ".swift", ".kt", ".md", ".json", ".yaml", ".yml", ".sql",
            ".html", ".css", ".scss", ".proto",
        }
        ext = file_path[file_path.rfind("."):] if "." in file_path else ""
        if ext.lower() not in summarizable_extensions:
            return ""

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a software architect summarizing code files. Respond in exactly 1 or 2 concise sentences describing what this file does in the system.",
                    },
                    {"role": "user", "content": f"File: {file_path}\n\nContent:\n{content[:1500]}"},
                ],
                temperature=0.3,
                max_tokens=150,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Failed summary generation for {file_path}: {e}")
            return ""

    def _should_ignore(self, file_path: str) -> bool:
        """Filter out binary, lockfiles, media, and irrelevant build directories."""
        ignored_extensions = {
            ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
            ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz",
            ".woff", ".woff2", ".ttf", ".eot",
            ".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".class",
            ".log", ".lock", ".map", ".min.js", ".min.css",
        }
        ignored_files = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "Cargo.lock"}
        ignored_dirs = {
            "node_modules", ".git", "venv", ".venv", "__pycache__",
            "dist", "build", ".next", ".nuxt", ".output", ".vscode", ".idea",
            "coverage", ".turbo",
        }

        parts = file_path.split("/")
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
        """Main entry point for background ingestion worker covering Code, Commits, and PRs."""
        print(f"Starting GitHub ingestion for project {self.project_id}...")

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
            raw_repo = project.github_repo_name or project.github_repo_url
            if not raw_repo:
                print(f"Project {self.project_id} has no GitHub repo configured.")
                return

            repo_name = self._normalize_repo_name(raw_repo)
            branch = project.github_branch or "main"

            await self._update_status(
                db,
                {
                    "ingestion_status.sync_state": "RUNNING",
                    "ingestion_status.github_backfill_complete": False,
                    "ingestion_status.last_github_sync": datetime.now(timezone.utc).isoformat(),
                    "ingestion_status.last_github_error": None,
                },
            )

            collection_name = project.qdrant_collection_name
            await qdrant_service.ensure_collection(collection_name)

            # 2. Download and unpack repository files in 1 request
            zip_bytes, source_method = await self._download_repo_archive(repo_name, branch=branch)
            zip_file = zipfile.ZipFile(io.BytesIO(zip_bytes))

            files_to_process: list[tuple[str, str]] = []
            for zip_entry in zip_file.namelist():
                if zip_entry.endswith("/"):
                    continue
                entry_parts = zip_entry.split("/")
                if len(entry_parts) < 2:
                    continue
                relative_path = "/".join(entry_parts[1:])
                if self._should_ignore(relative_path):
                    continue

                info = zip_file.getinfo(zip_entry)
                if info.file_size > 500_000:
                    continue

                try:
                    file_bytes = zip_file.read(zip_entry)
                    decoded_text = file_bytes.decode("utf-8", errors="replace")
                    if len(decoded_text.strip()) > 0:
                        files_to_process.append((relative_path, decoded_text))
                except Exception as read_err:
                    print(f"Skipping unreadable file {relative_path}: {read_err}")

            print(f"[GitHub Ingestion] Extracted {len(files_to_process)} code/doc files from {repo_name} ({source_method})")

            # 3. Vector Embed and Index Files
            file_chunks_count = 0
            file_embedding_errors: list[str] = []
            for relative_path, file_content in files_to_process:
                try:
                    metadata = {
                        "project_id": self.project_id,
                        "file_path": relative_path,
                        "url": f"https://github.com/{repo_name}/blob/{branch}/{relative_path}",
                    }
                    points = await self.embedding_service.chunk_and_embed(
                        text=file_content,
                        source_type="github_file",
                        source_id=relative_path,
                        metadata=metadata,
                    )
                    if points:
                        await qdrant_service.upsert_points(collection_name, points)
                        file_chunks_count += len(points)

                    summary = await self._generate_summary(relative_path, file_content)
                    if summary:
                        summary_points = await self.embedding_service.chunk_and_embed(
                            text=summary,
                            source_type="file_summary",
                            source_id=f"{relative_path}_summary",
                            metadata=metadata,
                        )
                        if summary_points:
                            await qdrant_service.upsert_points(collection_name, summary_points)
                            file_chunks_count += len(summary_points)
                except Exception as e:
                    print(f"Error embedding file {relative_path}: {e}")
                    file_embedding_errors.append(f"{relative_path}: {e}")

            if file_embedding_errors:
                raise RuntimeError(
                    f"Failed to embed {len(file_embedding_errors)} GitHub file(s): "
                    + "; ".join(file_embedding_errors[:5])
                )

            # 4. Ingest Commits & Pull Requests
            commit_chunks_count, latest_commit_sha = await self._ingest_commits(repo_name, collection_name)
            pr_chunks_count = await self._ingest_pull_requests(repo_name, collection_name)

            total_chunks = file_chunks_count + commit_chunks_count + pr_chunks_count

            # 5. Update success status in MongoDB
            await self._update_status(
                db,
                {
                    "ingestion_status.sync_state": "COMPLETED",
                    "ingestion_status.github_backfill_complete": True,
                    "ingestion_status.github_chunks_count": total_chunks,
                    "ingestion_status.indexed_commits_count": commit_chunks_count,
                    "ingestion_status.indexed_prs_count": pr_chunks_count,
                    "ingestion_status.last_commit_sha": latest_commit_sha,
                    "ingestion_status.last_github_error": None,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            print(f"[GitHub Ingestion] Ingestion complete: {total_chunks} chunks ({file_chunks_count} files, {commit_chunks_count} commits, {pr_chunks_count} PRs) for {repo_name}!")

        except Exception as e:
            err_str = str(e)
            print(f"[GitHub Ingestion] Fatal error during ingestion: {err_str}")
            await self._update_status(
                db,
                {
                    "ingestion_status.sync_state": "FAILED",
                    "ingestion_status.github_backfill_complete": False,
                    "ingestion_status.last_github_error": err_str,
                },
            )
        finally:
            db_client.close()

    @classmethod
    async def disconnect_repository(cls, project_id: str, db: AsyncIOMotorDatabase) -> bool:
        """Disconnect GitHub repo and purge associated memory vectors."""
        project_doc = await db["projects"].find_one({"project_id": project_id})
        if not project_doc:
            return False

        project = ProjectModel(**project_doc)
        collection_name = project.qdrant_collection_name

        # Invalidate GitHub vectors
        memory_service = ProjectMemoryService()
        for source_type in ["github_file", "file_summary", "github_commit", "github_pr"]:
            try:
                await memory_service.invalidate_source_memory(
                    project_id=project_id,
                    source_type=source_type,
                    source_id="*",
                    collection_name=collection_name,
                )
            except Exception as e:
                print(f"[GitHub Ingestion] Purge warning for {source_type}: {e}")

        # Update Project doc
        await db["projects"].update_one(
            {"project_id": project_id},
            {
                "$set": {
                    "github_repo_url": "",
                    "github_repo_name": "",
                    "ingestion_status.github_backfill_complete": False,
                    "ingestion_status.github_chunks_count": 0,
                    "ingestion_status.indexed_commits_count": 0,
                    "ingestion_status.indexed_prs_count": 0,
                    "ingestion_status.last_commit_sha": None,
                    "ingestion_status.last_github_error": None,
                    "ingestion_status.sync_state": "IDLE",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        return True

    @classmethod
    async def handle_webhook_event(
        cls, project_id: str, event_type: str, payload: dict[str, Any], db: AsyncIOMotorDatabase
    ):
        """Process incoming GitHub push / pull_request webhook events asynchronously."""
        try:
            project_doc = await db["projects"].find_one({"project_id": project_id})
            if not project_doc:
                return

            project = ProjectModel(**project_doc)
            collection_name = project.qdrant_collection_name
            embedding_service = EmbeddingService()
            from app.core.database import get_qdrant
            qdrant = get_qdrant()
            qdrant_service = QdrantService(qdrant)

            if event_type == "push":
                commits = payload.get("commits", [])
                for c in commits:
                    sha = c.get("id", "")
                    author = c.get("author", {}).get("name", "Unknown")
                    message = c.get("message", "")
                    text = f"GitHub Push Commit ({sha[:7]}) by {author}: {message}"
                    try:
                        points = await embedding_service.chunk_and_embed(
                            text=text,
                            source_type="github_commit",
                            source_id=sha,
                            metadata={"project_id": project_id, "commit_sha": sha, "author": author, "url": c.get("url", "")},
                        )
                        if points:
                            await qdrant_service.upsert_points(collection_name, points)
                    except Exception as embed_err:
                        print(f"[Webhook] Commit vectoring: {embed_err}")

            elif event_type == "pull_request":
                pr = payload.get("pull_request", {})
                pr_num = pr.get("number")
                title = pr.get("title", "")
                action = payload.get("action", "opened")
                user = pr.get("user", {}).get("login", "unknown")
                text = f"Pull Request #{pr_num} ({action}) by @{user}: {title}\n{pr.get('body', '')}"
                try:
                    points = await embedding_service.chunk_and_embed(
                        text=text,
                        source_type="github_pr",
                        source_id=f"pr_{pr_num}",
                        metadata={"project_id": project_id, "pr_number": pr_num, "author": user, "url": pr.get("html_url", "")},
                    )
                    if points:
                        await qdrant_service.upsert_points(collection_name, points)
                except Exception as embed_err:
                    print(f"[Webhook] PR vectoring: {embed_err}")
        except Exception as e:
            print(f"[Webhook] Error processing event: {e}")


def run_github_ingestion(project_id: str, access_token: str = ""):
    """Synchronous wrapper for RQ background worker to execute ingestion."""
    service = GitHubIngestionService(project_id, access_token)
    asyncio.run(service.ingest_repository())
