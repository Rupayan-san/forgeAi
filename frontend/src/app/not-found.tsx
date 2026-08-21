import Link from "next/link";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="surface p-10 max-w-sm w-full text-center">
        <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center mx-auto mb-5">
          <Zap className="w-5 h-5 text-[#10b981]" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold text-[#fafafa] mb-1.5 tracking-tight">404</h1>
        <p className="text-[#525252] text-[13px] mb-5">
          This page doesn&apos;t exist in the knowledge graph.
        </p>
        <Link
          href="/"
          className="inline-flex px-5 py-2 bg-[#10b981] text-white text-[13px] font-medium rounded-md hover:bg-[#059669] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
