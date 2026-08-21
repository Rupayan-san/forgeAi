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
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient GET Error] ${res.status} on ${endpoint}:`, error);
      throw new Error(error.detail || `API GET request failed with status ${res.status}`);
    }
    return res.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient POST Error] ${res.status} on ${endpoint}:`, error);
      throw new Error(error.detail || `API POST request failed with status ${res.status}`);
    }
    return res.json();
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient PUT Error] ${res.status} on ${endpoint}:`, error);
      throw new Error(error.detail || `API PUT request failed with status ${res.status}`);
    }
    return res.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient DELETE Error] ${res.status} on ${endpoint}:`, error);
      throw new Error(error.detail || `API DELETE request failed with status ${res.status}`);
    }
    return res.json();
  }

  async stream(endpoint: string, data?: unknown): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
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
