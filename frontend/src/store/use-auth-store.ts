"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthState } from "@/types";
import { api } from "@/lib/api";
import { API_V1_URL } from "@/lib/constants";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: () => {
        window.location.href = `${API_V1_URL}/auth/github/login`;
      },

      setAuth: (user: User, token: string) => {
        api.setToken(token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },

      checkAuth: async () => {
        let token = get().token;
        if (!token && typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("forge-auth");
            if (raw) {
              const parsed = JSON.parse(raw);
              token = parsed?.state?.token;
            }
          } catch {}
        }

        if (!token) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }

        api.setToken(token);
        set({ token, isAuthenticated: true, isLoading: true });

        try {
          const user = await api.get<User>("/auth/me");
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          console.warn("Session check returned error:", err);
          // If auth fails (401, unauthorized, invalid user), reset token and clear auth
          if (
            err?.message?.includes("401") ||
            err?.message?.includes("403") ||
            err?.message?.includes("404") ||
            err?.message?.includes("Unauthorized") ||
            err?.message?.includes("expired") ||
            err?.message?.includes("User not found")
          ) {
            api.setToken(null);
            if (typeof window !== "undefined") {
              try {
                localStorage.removeItem("forge-auth");
                localStorage.removeItem("token");
              } catch {}
            }
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        }
      },
    }),
    {
      name: "forge-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
          state.isAuthenticated = true;
        }
      },
    }
  )
);
