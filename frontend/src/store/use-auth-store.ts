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
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          api.setToken(token);
          const user = await api.get<User>("/auth/me");
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "forge-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
