"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";
import { Sidebar } from "@/components/shared/sidebar";
import { Loader2, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated && !token) {
      router.replace("/login");
    }
  }, [mounted, isLoading, isAuthenticated, token, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchProjects();
    }
  }, [isAuthenticated, token, fetchProjects]);

  if (!mounted || (isLoading && !user && !token)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
          <p className="text-[#525252] text-[13px]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#737373] hover:text-[#fafafa] transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless menu open */}
      <div className={`hidden lg:block`}>
        <Sidebar />
      </div>
      {mobileMenuOpen && (
        <div className="lg:hidden fixed z-50 top-0 left-0 bottom-0">
          <Sidebar />
        </div>
      )}

      {/* Main content */}
      <main className="lg:ml-[240px] pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
