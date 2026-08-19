import Link from "next/link";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-12 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/20 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-[#6366F1]" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-[rgba(255,255,255,0.7)] mb-6">
          This page doesn't exist in the knowledge graph.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-[#6366F1] text-white font-medium rounded-xl hover:bg-[#4F46E5] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
