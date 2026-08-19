export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_V1_URL = `${API_BASE_URL}/api/v1`;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CALLBACK: "/callback",
  DASHBOARD: "/dashboard",
  PROJECT: (id: string) => `/project/${id}`,
  CHAT: (id: string) => `/project/${id}/chat`,
  VOICE: (id: string) => `/project/${id}/voice`,
  DECISIONS: (id: string) => `/project/${id}/decisions`,
  SETTINGS: "/settings",
} as const;

export const FORGE_CONFIG = {
  APP_NAME: "Forge",
  APP_TAGLINE: "Your team's memory, always on.",
  APP_DESCRIPTION: "Voice-native AI project memory for hackathon teams.",
} as const;
