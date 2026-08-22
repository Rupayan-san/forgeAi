from datetime import datetime, timezone
from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict


PyObjectId = Annotated[str, BeforeValidator(lambda x: str(x) if isinstance(x, ObjectId) else str(x))]


class TechnologySection(BaseModel):
    """Technology conventions and stack definitions."""
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    infrastructure: list[str] = Field(default_factory=list)
    external_services: list[str] = Field(default_factory=list)
    notes: str = ""


class ArchitectureSection(BaseModel):
    """System and software architecture rules."""
    style: str = ""  # e.g., "Clean Architecture", "Modular Monolith", "Microservices"
    rules: list[str] = Field(default_factory=list)
    service_boundaries: list[str] = Field(default_factory=list)
    dependency_rules: list[str] = Field(default_factory=list)
    layering_rules: list[str] = Field(default_factory=list)
    notes: str = ""


class CodingStandardsSection(BaseModel):
    """Team coding guidelines and formatting standards."""
    naming_conventions: list[str] = Field(default_factory=list)
    formatting: list[str] = Field(default_factory=list)
    code_organization: list[str] = Field(default_factory=list)
    error_handling: list[str] = Field(default_factory=list)
    typing: list[str] = Field(default_factory=list)
    notes: str = ""


class GitWorkflowSection(BaseModel):
    """Git branch, commit, and PR protocols."""
    branch_naming: list[str] = Field(default_factory=list)
    commit_conventions: list[str] = Field(default_factory=list)
    pr_conventions: list[str] = Field(default_factory=list)
    merge_strategy: str = ""  # e.g., "Squash and merge", "Rebase", "Merge commit"
    notes: str = ""


class ApiConventionsSection(BaseModel):
    """API design, endpoint naming, and contract rules."""
    style: str = "REST"  # e.g., "REST", "GraphQL", "gRPC"
    endpoint_naming: list[str] = Field(default_factory=list)
    response_format: str = ""
    error_format: str = ""
    versioning_rules: list[str] = Field(default_factory=list)
    notes: str = ""


class DesignUiConventionsSection(BaseModel):
    """Frontend, design system, and UI/UX conventions."""
    component_conventions: list[str] = Field(default_factory=list)
    styling_conventions: list[str] = Field(default_factory=list)
    accessibility_rules: list[str] = Field(default_factory=list)
    state_management: list[str] = Field(default_factory=list)
    notes: str = ""


class GeneralRulesSection(BaseModel):
    """General team rules and technical agreements."""
    custom_rules: list[str] = Field(default_factory=list)
    restrictions: list[str] = Field(default_factory=list)
    important_agreements: list[str] = Field(default_factory=list)
    notes: str = ""


class ConstitutionSections(BaseModel):
    """Root container for all 7 Project Constitution sections."""
    technology: TechnologySection = Field(default_factory=TechnologySection)
    architecture: ArchitectureSection = Field(default_factory=ArchitectureSection)
    coding_standards: CodingStandardsSection = Field(default_factory=CodingStandardsSection)
    git_workflow: GitWorkflowSection = Field(default_factory=GitWorkflowSection)
    api_conventions: ApiConventionsSection = Field(default_factory=ApiConventionsSection)
    design_ui_conventions: DesignUiConventionsSection = Field(default_factory=DesignUiConventionsSection)
    general_rules: GeneralRulesSection = Field(default_factory=GeneralRulesSection)


class ConstitutionModel(BaseModel):
    """Authoritative Project Constitution MongoDB document."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    project_id: str
    version: int = 1
    sections: ConstitutionSections = Field(default_factory=ConstitutionSections)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: str  # user_id of updater


class ConstitutionUpdate(BaseModel):
    """Payload schema for updating a project constitution."""
    sections: ConstitutionSections
    change_summary: Optional[str] = Field(default=None, max_length=500)


class ConstitutionHistoryModel(BaseModel):
    """Snapshot of a historical Constitution version."""
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    project_id: str
    version: int
    sections: ConstitutionSections
    created_at: datetime
    updated_at: datetime
    updated_by: str
    change_summary: Optional[str] = None
