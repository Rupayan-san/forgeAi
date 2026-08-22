"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Settings,
  Plus,
  LogOut,
  Folder,
  ChevronDown,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };
  const { projects } = useProjectStore();
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 w-[240px] flex flex-col bg-[#0a0a0a] border-r border-[#1a1a1a]"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-[#1a1a1a]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#10b981] flex items-center justify-center shrink-0">
            <Zap className="w-3 h-3 text-white" strokeWidth={2} />
          </div>
          <span className="text-[13px] font-semibold text-[#fafafa] tracking-tight">Forge</span>
        </Link>
      </div>

      {/* Search (decorative) */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#111111] border border-[#1a1a1a] text-[#525252] text-[12px]">
          <Search className="w-3 h-3" strokeWidth={2} />
          <span>Search...</span>
          <span className="ml-auto text-[10px] text-[#404040] border border-[#262626] rounded px-1 py-0.5 font-mono">⌘K</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto">
        <div className="space-y-0.5">
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors ${
                  isActive
                    ? "bg-[#111111] text-[#fafafa]"
                    : "text-[#737373] hover:text-[#a3a3a3] hover:bg-[#0f0f0f]"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Projects section */}
        <div className="mt-5">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center justify-between w-full px-2.5 py-1 text-[11px] font-medium text-[#525252] uppercase tracking-wider hover:text-[#737373] transition-colors cursor-pointer"
          >
            <span>Projects</span>
            <div className="flex items-center gap-1">
              <Link
                href="/dashboard"
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded flex items-center justify-center text-[#525252] hover:text-[#10b981] hover:bg-[#111111] transition-colors"
              >
                <Plus className="w-3 h-3" strokeWidth={2} />
              </Link>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${projectsExpanded ? "" : "-rotate-90"}`}
                strokeWidth={2}
              />
            </div>
          </button>

          {projectsExpanded && (
            <div className="mt-1 space-y-0.5">
              {projects.length === 0 ? (
                <p className="px-2.5 py-2 text-[11px] text-[#404040]">
                  No projects yet
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = pathname.includes(`/project/${project.project_id}`);
                  return (
                    <Link
                      key={project.project_id}
                      href={`/project/${project.project_id}`}
                      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors ${
                        isActive
                          ? "bg-[#111111] text-[#fafafa]"
                          : "text-[#737373] hover:text-[#a3a3a3] hover:bg-[#0f0f0f]"
                      }`}
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Settings link at bottom of nav */}
        <div className="mt-5 pt-3 border-t border-[#1a1a1a]">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors ${
              pathname === "/settings"
                ? "bg-[#111111] text-[#fafafa]"
                : "text-[#737373] hover:text-[#a3a3a3] hover:bg-[#0f0f0f]"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-2.5">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || ""}
              className="w-7 h-7 rounded-md shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-[#171717] shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-[#a3a3a3] truncate font-medium">
              {user?.name || user?.github_username}
            </p>
            <p className="text-[10px] text-[#525252] truncate">@{user?.github_username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#525252] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors cursor-pointer shrink-0"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
