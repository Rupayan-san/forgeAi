"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        setAuth(user, token);
        window.location.href = "/dashboard";
      } catch {
        setError("Failed to parse authentication data");
      }
    } else {
      setError("Missing authentication data");
    }
  }, [searchParams, setAuth]);

  if (error) {
    return (
      <div className="glass p-8 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Failed</h2>
        <p className="text-[rgba(255,255,255,0.7)] text-sm mb-4">{error}</p>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-2 bg-[#6366F1] text-white rounded-xl hover:bg-[#4F46E5] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" strokeWidth={1.5} />
      <p className="text-[rgba(255,255,255,0.7)]">Authenticating...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" strokeWidth={1.5} />
          <p className="text-[rgba(255,255,255,0.7)]">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
