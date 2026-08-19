"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Settings,
  Plus,
  LogOut,
  MessageSquare,
  Mic,
  FileText,
  ChevronLeft,
  ChevronRight,
  Folder,
} from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { projects } = useProjectStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-white">Forge</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-[rgba(99,102,241,0.15)] text-[#818CF8]"
                    : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                }`}
              >
                <item.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Projects section */}
        {!collapsed && (
          <div className="mt-8">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-medium text-[rgba(255,255,255,0.3)] uppercase tracking-wider">
                Projects
              </span>
              <Link
                href="/dashboard"
                className="w-5 h-5 rounded-md flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-[#818CF8] hover:bg-[rgba(99,102,241,0.1)] transition-colors"
              >
                <Plus className="w-3 h-3" strokeWidth={1.5} />
              </Link>
            </div>
            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[rgba(255,255,255,0.25)]">
                  No projects yet
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = pathname.includes(`/project/${project.project_id}`);
                  return (
                    <Link
                      key={project.project_id}
                      href={`/project/${project.project_id}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                        isActive
                          ? "bg-[rgba(99,102,241,0.15)] text-[#818CF8]"
                          : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                      }`}
                    >
                      <Folder className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.06)]">
        {collapsed ? (
          <div className="flex justify-center">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || ""}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)]" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || ""}
                className="w-8 h-8 rounded-full shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.name || user?.github_username}</p>
              <p className="text-xs text-[rgba(255,255,255,0.3)] truncate">@{user?.github_username}</p>
            </div>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
