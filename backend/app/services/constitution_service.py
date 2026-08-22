from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.models.constitution import (
    ConstitutionModel,
    ConstitutionUpdate,
    ConstitutionHistoryModel,
    ConstitutionSections,
)


class ConstitutionService:
    """Service layer for Project Constitution management, versioning, and context formatting."""

    COLLECTION_NAME = "project_constitutions"
    HISTORY_COLLECTION_NAME = "constitution_history"

    @classmethod
    async def get_or_create_constitution(
        cls, db: AsyncIOMotorDatabase, project_id: str, user_id: str = "system"
    ) -> ConstitutionModel:
        """Fetch the active constitution for a project or initialize a default one if none exists."""
        from app.services.cache_service import cache_service

        doc = await db[cls.COLLECTION_NAME].find_one({"project_id": project_id})
        if doc:
            model = ConstitutionModel(**doc)
            cache_service.set_cached_constitution(project_id, model.model_dump(by_alias=True))
            return model

        now = datetime.now(timezone.utc)
        initial_constitution = ConstitutionModel(
            id=str(ObjectId()),
            project_id=project_id,
            version=1,
            sections=ConstitutionSections(),
            created_at=now,
            updated_at=now,
            updated_by=user_id,
        )
        await db[cls.COLLECTION_NAME].insert_one(initial_constitution.model_dump(by_alias=True))
        cache_service.set_cached_constitution(project_id, initial_constitution.model_dump(by_alias=True))
        return initial_constitution

    @classmethod
    async def update_constitution(
        cls,
        db: AsyncIOMotorDatabase,
        project_id: str,
        update_data: ConstitutionUpdate,
        user_id: str,
    ) -> ConstitutionModel:
        """Archive the current constitution version and apply the new updated version."""
        from app.services.cache_service import cache_service
        current = await cls.get_or_create_constitution(db, project_id, user_id)

        # 1. Archive current active version to history
        now = datetime.now(timezone.utc)
        history_entry = ConstitutionHistoryModel(
            id=str(ObjectId()),
            project_id=project_id,
            version=current.version,
            sections=current.sections,
            created_at=current.created_at,
            updated_at=current.updated_at,
            updated_by=current.updated_by,
            change_summary=update_data.change_summary,
        )
        await db[cls.HISTORY_COLLECTION_NAME].insert_one(history_entry.model_dump(by_alias=True))

        # 2. Update active constitution document with incremented version
        new_version = current.version + 1
        updated_dict = {
            "version": new_version,
            "sections": update_data.sections.model_dump(),
            "updated_at": now,
            "updated_by": user_id,
        }

        await db[cls.COLLECTION_NAME].update_one(
            {"project_id": project_id},
            {"$set": updated_dict},
            upsert=True,
        )

        # Invalidate cache
        cache_service.invalidate_constitution(project_id)

        doc = await db[cls.COLLECTION_NAME].find_one({"project_id": project_id})
        model = ConstitutionModel(**doc)
        cache_service.set_cached_constitution(project_id, model.model_dump(by_alias=True))
        return model

    @classmethod
    async def get_history(
        cls,
        db: AsyncIOMotorDatabase,
        project_id: str,
        limit: int = 20,
        skip: int = 0,
    ) -> list[ConstitutionHistoryModel]:
        """Fetch historical snapshots of past constitution versions for a project."""
        cursor = (
            db[cls.HISTORY_COLLECTION_NAME]
            .find({"project_id": project_id})
            .sort("version", -1)
            .skip(skip)
            .limit(limit)
        )
        history_list = []
        async for doc in cursor:
            history_list.append(ConstitutionHistoryModel(**doc))
        return history_list

    @classmethod
    async def get_version_snapshot(
        cls,
        db: AsyncIOMotorDatabase,
        project_id: str,
        version: int,
    ) -> ConstitutionHistoryModel | None:
        """Fetch a specific historical snapshot by version number."""
        doc = await db[cls.HISTORY_COLLECTION_NAME].find_one(
            {"project_id": project_id, "version": version}
        )
        if not doc:
            return None
        return ConstitutionHistoryModel(**doc)

    @classmethod
    async def format_constitution_for_ai(
        cls, db: AsyncIOMotorDatabase, project_id: str
    ) -> str:
        """Format the active project constitution into structured markdown context for AI prompts."""
        doc = await db[cls.COLLECTION_NAME].find_one({"project_id": project_id})
        if not doc:
            return "No Project Constitution defined yet."

        constitution = ConstitutionModel(**doc)
        s = constitution.sections
        parts = [f"### Project Constitution (v{constitution.version})"]

        # Technology
        tech_lines = []
        if s.technology.languages:
            tech_lines.append(f"- Languages: {', '.join(s.technology.languages)}")
        if s.technology.frameworks:
            tech_lines.append(f"- Frameworks: {', '.join(s.technology.frameworks)}")
        if s.technology.databases:
            tech_lines.append(f"- Databases: {', '.join(s.technology.databases)}")
        if s.technology.infrastructure:
            tech_lines.append(f"- Infrastructure: {', '.join(s.technology.infrastructure)}")
        if s.technology.external_services:
            tech_lines.append(f"- External Services: {', '.join(s.technology.external_services)}")
        if s.technology.notes:
            tech_lines.append(f"- Notes: {s.technology.notes}")
        if tech_lines:
            parts.append("#### Technology Stack\n" + "\n".join(tech_lines))

        # Architecture
        arch_lines = []
        if s.architecture.style:
            arch_lines.append(f"- Style: {s.architecture.style}")
        if s.architecture.rules:
            arch_lines.append(f"- Core Rules: {'; '.join(s.architecture.rules)}")
        if s.architecture.service_boundaries:
            arch_lines.append(f"- Service Boundaries: {'; '.join(s.architecture.service_boundaries)}")
        if s.architecture.dependency_rules:
            arch_lines.append(f"- Dependency Rules: {'; '.join(s.architecture.dependency_rules)}")
        if s.architecture.layering_rules:
            arch_lines.append(f"- Layering Rules: {'; '.join(s.architecture.layering_rules)}")
        if s.architecture.notes:
            arch_lines.append(f"- Notes: {s.architecture.notes}")
        if arch_lines:
            parts.append("#### Architecture Rules\n" + "\n".join(arch_lines))

        # Coding Standards
        code_lines = []
        if s.coding_standards.naming_conventions:
            code_lines.append(f"- Naming: {'; '.join(s.coding_standards.naming_conventions)}")
        if s.coding_standards.formatting:
            code_lines.append(f"- Formatting: {'; '.join(s.coding_standards.formatting)}")
        if s.coding_standards.code_organization:
            code_lines.append(f"- Organization: {'; '.join(s.coding_standards.code_organization)}")
        if s.coding_standards.error_handling:
            code_lines.append(f"- Error Handling: {'; '.join(s.coding_standards.error_handling)}")
        if s.coding_standards.typing:
            code_lines.append(f"- Typing: {'; '.join(s.coding_standards.typing)}")
        if s.coding_standards.notes:
            code_lines.append(f"- Notes: {s.coding_standards.notes}")
        if code_lines:
            parts.append("#### Coding Standards\n" + "\n".join(code_lines))

        # Git Workflow
        git_lines = []
        if s.git_workflow.branch_naming:
            git_lines.append(f"- Branch Naming: {'; '.join(s.git_workflow.branch_naming)}")
        if s.git_workflow.commit_conventions:
            git_lines.append(f"- Commit Conventions: {'; '.join(s.git_workflow.commit_conventions)}")
        if s.git_workflow.pr_conventions:
            git_lines.append(f"- PR Conventions: {'; '.join(s.git_workflow.pr_conventions)}")
        if s.git_workflow.merge_strategy:
            git_lines.append(f"- Merge Strategy: {s.git_workflow.merge_strategy}")
        if s.git_workflow.notes:
            git_lines.append(f"- Notes: {s.git_workflow.notes}")
        if git_lines:
            parts.append("#### Git Workflow\n" + "\n".join(git_lines))

        # API Conventions
        api_lines = []
        if s.api_conventions.style:
            api_lines.append(f"- Style: {s.api_conventions.style}")
        if s.api_conventions.endpoint_naming:
            api_lines.append(f"- Endpoint Naming: {'; '.join(s.api_conventions.endpoint_naming)}")
        if s.api_conventions.response_format:
            api_lines.append(f"- Response Format: {s.api_conventions.response_format}")
        if s.api_conventions.error_format:
            api_lines.append(f"- Error Format: {s.api_conventions.error_format}")
        if s.api_conventions.versioning_rules:
            api_lines.append(f"- Versioning: {'; '.join(s.api_conventions.versioning_rules)}")
        if s.api_conventions.notes:
            api_lines.append(f"- Notes: {s.api_conventions.notes}")
        if api_lines:
            parts.append("#### API Conventions\n" + "\n".join(api_lines))

        # Design & UI Conventions
        ui_lines = []
        if s.design_ui_conventions.component_conventions:
            ui_lines.append(f"- Components: {'; '.join(s.design_ui_conventions.component_conventions)}")
        if s.design_ui_conventions.styling_conventions:
            ui_lines.append(f"- Styling: {'; '.join(s.design_ui_conventions.styling_conventions)}")
        if s.design_ui_conventions.accessibility_rules:
            ui_lines.append(f"- Accessibility: {'; '.join(s.design_ui_conventions.accessibility_rules)}")
        if s.design_ui_conventions.state_management:
            ui_lines.append(f"- State Management: {'; '.join(s.design_ui_conventions.state_management)}")
        if s.design_ui_conventions.notes:
            ui_lines.append(f"- Notes: {s.design_ui_conventions.notes}")
        if ui_lines:
            parts.append("#### Design & UI Conventions\n" + "\n".join(ui_lines))

        # General Rules
        general_lines = []
        if s.general_rules.custom_rules:
            general_lines.append(f"- Custom Rules: {'; '.join(s.general_rules.custom_rules)}")
        if s.general_rules.restrictions:
            general_lines.append(f"- Restrictions: {'; '.join(s.general_rules.restrictions)}")
        if s.general_rules.important_agreements:
            general_lines.append(f"- Agreements: {'; '.join(s.general_rules.important_agreements)}")
        if s.general_rules.notes:
            general_lines.append(f"- Notes: {s.general_rules.notes}")
        if general_lines:
            parts.append("#### General Rules & Agreements\n" + "\n".join(general_lines))

        return "\n\n".join(parts) if len(parts) > 1 else "Project Constitution is currently unconfigured."
