import { API_V1_URL } from "./constants";

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    let token = this.token;
    if (!token && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("forge-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.state?.token;
        }
        if (!token) {
          token = localStorage.getItem("token");
        }
        if (token) {
          this.token = token;
        }
      } catch {}
    }
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });
    } catch (networkErr: any) {
      console.error(`[ApiClient Network Error] on ${endpoint}:`, networkErr);
      throw new Error(`Cannot connect to Forge API server (${this.baseUrl}). Please ensure backend is running.`);
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      if (res.status === 401) {
        // Only clear auth state when verifying identity fails (e.g. /auth/me).
        // A 401 on a regular endpoint should NOT wipe the user's session —
        // the token may still be valid but the backend was temporarily unreachable
        // or a new endpoint isn't deployed yet.
        const isAuthEndpoint = endpoint.startsWith("/auth/");
        if (isAuthEndpoint) {
          this.setToken(null);
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("forge-auth");
            } catch {}
          }
        }
      } else {
        console.error(`[ApiClient Error] ${res.status} on ${endpoint}:`, error);
      }
      throw new Error(error.detail || `API request failed with status ${res.status}`);
    }
    return res.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async stream(endpoint: string, data?: unknown): Promise<ReadableStream<Uint8Array>> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      });
    } catch (networkErr: any) {
      console.error(`[ApiClient Stream Network Error] on ${endpoint}:`, networkErr);
      throw new Error(`Cannot connect to Forge API server (${this.baseUrl}).`);
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient STREAM Error] ${res.status} on ${endpoint}:`, error);
      throw new Error(error.detail || `Stream request failed with status ${res.status}`);
    }
    if (!res.body) {
      throw new Error("No response body for stream");
    }
    return res.body;
  }
}

export const api = new ApiClient(API_V1_URL);
