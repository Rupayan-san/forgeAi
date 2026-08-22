// ========== User Types ==========
export interface User {
  user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  github_username: string;
  created_at: string;
}

// ========== Project AI & Settings Types ==========
export interface ProjectAIConfig {
  name: string;
  role: string;
  invocation_phrase: string;
}

export interface IngestionStatus {
  github_backfill_complete: boolean;
  discord_backfill_complete: boolean;
  last_github_sync: string | null;
  last_discord_sync: string | null;
  github_chunks_count: number;
  discord_chunks_count: number;
  indexed_commits_count?: number;
  indexed_prs_count?: number;
  last_commit_sha?: string | null;
  last_discord_message_id?: string | null;
  sync_state?: string;
  last_github_error?: string | null;
  last_discord_error?: string | null;
}

export interface MemberDetail {
  user_id: string;
  github_username: string;
  name: string | null;
  avatar_url: string | null;
  role: "owner" | "member" | "applicant";
  joined_at?: string | null;
}

export interface Project {
  project_id: string;
  name: string;
  description: string;
  owner_id: string;
  members: string[];
  member_roles?: Record<string, string>;
  ai_config: ProjectAIConfig;
  user_role?: "owner" | "member";
  github_repo_url: string;
  github_repo_name: string;
  github_branch?: string;
  discord_guild_id: string;
  discord_channels?: string[];
  discord_bot_active: boolean;
  ingestion_status: IngestionStatus;
  join_code: string;
  join_requests: string[];
  max_members: number;
  member_details: MemberDetail[];
  join_request_details?: MemberDetail[];
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  github_repo_url?: string;
  discord_guild_id?: string;
  max_members?: number;
  ai_config?: ProjectAIConfig;
}

export interface ProjectSettingsUpdate {
  name?: string;
  description?: string;
  max_members?: number;
  github_repo_url?: string;
  discord_guild_id?: string;
  ai_config?: ProjectAIConfig;
}

// ========== Project Constitution Types ==========
export interface TechnologySection {
  languages: string[];
  frameworks: string[];
  databases: string[];
  infrastructure: string[];
  external_services: string[];
  notes?: string;
}

export interface ArchitectureSection {
  style: string;
  rules: string[];
  service_boundaries: string[];
  dependency_rules: string[];
  layering_rules: string[];
  notes?: string;
}

export interface CodingStandardsSection {
  naming_conventions: string[];
  formatting: string[];
  code_organization: string[];
  error_handling: string[];
  typing: string[];
  notes?: string;
}

export interface GitWorkflowSection {
  branch_naming: string[];
  commit_conventions: string[];
  pr_conventions: string[];
  merge_strategy: string;
  notes?: string;
}

export interface ApiConventionsSection {
  style: string;
  endpoint_naming: string[];
  response_format: string;
  error_format: string;
  versioning_rules: string[];
  notes?: string;
}

export interface DesignUiConventionsSection {
  component_conventions: string[];
  styling_conventions: string[];
  accessibility_rules: string[];
  state_management: string[];
  notes?: string;
}

export interface GeneralRulesSection {
  custom_rules: string[];
  restrictions: string[];
  important_agreements: string[];
  notes?: string;
}

export interface ConstitutionSections {
  technology: TechnologySection;
  architecture: ArchitectureSection;
  coding_standards: CodingStandardsSection;
  git_workflow: GitWorkflowSection;
  api_conventions: ApiConventionsSection;
  design_ui_conventions: DesignUiConventionsSection;
  general_rules: GeneralRulesSection;
}

export interface ProjectConstitution {
  id: string;
  project_id: string;
  version: number;
  sections: ConstitutionSections;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface ConstitutionHistoryItem {
  id: string;
  project_id: string;
  version: number;
  sections: ConstitutionSections;
  created_at: string;
  updated_at: string;
  updated_by: string;
  change_summary?: string | null;
}

export interface ConstitutionUpdatePayload {
  sections: ConstitutionSections;
  change_summary?: string;
}

// ========== Unified Chat Types ==========
export interface SourceCitation {
  source_type: string;
  source_id: string;
  source_url?: string;
  relevance_score: number;
  content_preview: string;
}

export interface ChatMessage {
  id?: string;
  message_id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: SourceCitation[];
  is_ai_generated?: boolean;
  is_ai_invocation?: boolean;
  interface_type?: "text" | "voice";
  trace?: string[];
  created_at: string;
  updated_at?: string | null;
}

// ========== Decision Types ==========
export type DecisionStatus = "ACTIVE" | "SUPERSEDED" | "CONFLICTED";

export interface ConflictInfo {
  other_decision_id: string;
  other_decision_text: string;
  relationship: "conflict" | "supersedes" | "superseded_by" | string;
  explanation: string;
}

export interface Decision {
  decision_id: string;
  project_id: string;
  decision_text: string;
  reasoning: string;
  alternatives_considered: string[];
  participants: string[];
  source_type: string;
  source_id: string;
  source_url: string;
  status: DecisionStatus;
  supersedes?: string | null;
  superseded_by?: string | null;
  timestamp: string;
  extracted_at: string;
  updated_at?: string | null;
  confidence_score: number;
  conflicts?: ConflictInfo[];
}

// ========== Project Memory Types ==========
export interface MemoryItem {
  memory_id: string;
  project_id: string;
  source_type: string;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  relevance_score: number;
  created_at: string;
}

export interface MemorySearchResult {
  project_id: string;
  query: string;
  total_results: number;
  items: MemoryItem[];
}

// ========== Activity Types ==========
export interface ActivityItem {
  id: string;
  type: "commit" | "pr" | "discord" | "decision" | "chat" | "member" | "sync";
  title: string;
  description: string;
  author: string;
  source: string;
  timestamp: string;
  url?: string;
}

// ========== Auth Types ==========
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// ========== Meeting & Voice Intelligence Types ==========
export type MeetingStatus = "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";

export interface MeetingParticipant {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  role: "host" | "participant" | "ai";
  joined_at: string;
  left_at?: string | null;
  is_muted?: boolean;
}

export interface Meeting {
  meeting_id: string;
  project_id: string;
  title: string;
  created_by: string;
  status: MeetingStatus;
  channel_name: string;
  started_at?: string | null;
  ended_at?: string | null;
  participants: MeetingParticipant[];
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  segment_id: string;
  meeting_id: string;
  project_id: string;
  speaker_id: string;
  speaker_name: string;
  text: string;
  is_final: boolean;
  sequence: number;
  timestamp: string;
}

export interface MeetingSummary {
  summary_id: string;
  meeting_id: string;
  project_id: string;
  overview: string;
  key_points: string[];
  decisions: string[];
  action_items: string[];
  unresolved_questions: string[];
  generated_at: string;
}

export type ActionItemStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface ActionItem {
  action_id: string;
  project_id: string;
  meeting_id?: string | null;
  title: string;
  description: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  due_at?: string | null;
  status: ActionItemStatus;
  confidence_score: number;
  source_transcript_segment_id?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

// ========== Project Intelligence Types (Step 11) ==========
export type HealthStatus = "HEALTHY" | "ATTENTION" | "AT_RISK" | "UNKNOWN";
export type RiskSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type ConsistencyIssueType =
  | "DECISION_VS_CODE"
  | "CONSTITUTION_VS_CODE"
  | "DOCUMENTATION_DRIFT"
  | "DECISION_STALENESS";

export interface ProjectStateSnapshot {
  snapshot_id: string;
  project_id: string;
  generated_at: string;
  project_summary: string;
  current_phase: string;
  active_work: string[];
  completed_work: string[];
  blocked_work: string[];
  technical_stack: Record<string, string[]>;
  active_decisions_count: number;
  open_action_items_count: number;
  overdue_action_items_count: number;
  health_status: HealthStatus;
  health_reasons: string[];
  confidence: string;
}

export interface ProjectRisk {
  risk_id: string;
  project_id: string;
  title: string;
  impact_explanation: string;
  severity: RiskSeverity;
  evidence: Array<Record<string, unknown>>;
  detected_at: string;
  status: RiskStatus;
}

export interface ConsistencyIssue {
  issue_id: string;
  project_id: string;
  issue_type: ConsistencyIssueType;
  title: string;
  description: string;
  documented_claim: string;
  observed_evidence: string;
  confidence: string;
  detected_at: string;
}

export interface KnowledgeGap {
  gap_id: string;
  project_id: string;
  area: string;
  description: string;
  suggested_action: string;
  detected_at: string;
}

export interface ProjectTimelineEvent {
  event_id: string;
  project_id: string;
  event_type: "DECISION" | "MEETING" | "COMMIT" | "PR" | "ACTION_ITEM" | "CONSTITUTION";
  source_id: string;
  title: string;
  description: string;
  author: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface SemanticChangeGroup {
  group_id: string;
  project_id: string;
  title: string;
  summary: string;
  related_commit_shas: string[];
  related_pr_numbers: number[];
  timestamp: string;
  area: string;
}

