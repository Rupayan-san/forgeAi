// ========== User Types ==========
export interface User {
  user_id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  github_username: string;
  created_at: string;
}

// ========== Project Types ==========
export interface IngestionStatus {
  github_backfill_complete: boolean;
  discord_backfill_complete: boolean;
  last_github_sync: string | null;
  last_discord_sync: string | null;
  github_chunks_count: number;
  discord_chunks_count: number;
}

export interface MemberDetail {
  user_id: string;
  github_username: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Project {
  project_id: string;
  name: string;
  description: string;
  owner_id: string;
  members: string[];
  github_repo_url: string;
  github_repo_name: string;
  discord_guild_id: string;
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
}

// ========== Chat Types ==========
export interface SourceCitation {
  source_type: "commit" | "pr" | "issue" | "readme" | "discord_message";
  source_id: string;
  source_url: string;
  relevance_score: number;
  content_preview: string;
}

export interface ChatMessage {
  message_id: string;
  project_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  interface_type: "text" | "voice";
  created_at: string;
}

// ========== Decision Types ==========
export interface Decision {
  decision_id: string;
  project_id: string;
  decision_text: string;
  reasoning: string;
  alternatives_considered: string[];
  participants: string[];
  source_type: "commit" | "pr" | "issue" | "discord";
  source_id: string;
  source_url: string;
  timestamp: string;
  extracted_at: string;
  confidence_score: number;
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
  logout: () => void;
  checkAuth: () => Promise<void>;
}
