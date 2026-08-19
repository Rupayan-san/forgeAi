"use client";

import { Zap } from "lucide-react";
import { GithubIcon } from "@/components/shared/github-icon";
import { useAuthStore } from "@/store/use-auth-store";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuthStore();

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#6366F1] flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-2xl font-bold text-white">Forge</span>
        </Link>
        <p className="text-[rgba(255,255,255,0.7)] text-sm">
          Sign in to access your project memory
        </p>
      </div>

      {/* Login Card */}
      <div className="glass p-8">
        <h1 className="text-xl font-semibold text-white mb-2">Welcome back</h1>
        <p className="text-[rgba(255,255,255,0.4)] text-sm mb-6">
          Connect your GitHub account to get started
        </p>

        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 cursor-pointer"
        >
          <GithubIcon className="w-5 h-5" size={20} />
          Continue with GitHub
        </button>

        <p className="text-[rgba(255,255,255,0.3)] text-xs text-center mt-6">
          By continuing, you agree to Forge's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
