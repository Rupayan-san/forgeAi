"use client";

import { create } from "zustand";
import type { Project } from "@/types";
import { api } from "@/lib/api";

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  createProject: (data: { name: string; description?: string; github_repo_url?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await api.get<Project[]>("/projects");
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const project = await api.get<Project>(`/projects/${id}`);
      set({ currentProject: project, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  createProject: async (data) => {
    const project = await api.post<Project>("/projects", data);
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
    set((state) => ({
      projects: state.projects.filter((p) => p.project_id !== id),
      currentProject: state.currentProject?.project_id === id ? null : state.currentProject,
    }));
  },
}));
