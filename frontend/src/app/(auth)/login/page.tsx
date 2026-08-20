"use client";

import { Zap } from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useAuthStore } from "@/store/use-auth-store";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuthStore();

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-md bg-[#10b981] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className="text-lg font-semibold text-[#fafafa] tracking-tight">Forge</span>
        </Link>
        <p className="text-[#525252] text-[13px]">
          Sign in to access your project memory
        </p>
      </div>

      {/* Login Card */}
      <div className="surface p-6">
        <h1 className="text-lg font-semibold text-[#fafafa] mb-1">Welcome back</h1>
        <p className="text-[#525252] text-[13px] mb-6">
          Connect your GitHub account to get started
        </p>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-2.5 bg-[#fafafa] text-[#050505] text-sm font-medium rounded-md hover:bg-[#e5e5e5] transition-colors cursor-pointer"
        >
          <GithubIcon className="w-4 h-4" size={16} />
          Continue with GitHub
        </button>

        <p className="text-[#404040] text-[11px] text-center mt-5">
          By continuing, you agree to Forge&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
