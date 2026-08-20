"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Zap,
  GitPullRequest,
  GitCommit,
  Hash,
  FileText,
  ArrowUpRight,
  Sparkles,
  User,
} from "lucide-react";

// Mock chat messages
const mockMessages = [
  {
    id: "1",
    role: "assistant" as const,
    content: "I'm ready to answer questions about this project. I have access to GitHub commits, PRs, issues, and Discord conversations. What would you like to know?",
    sources: [],
  },
];

const suggestedQueries = [
  "Why did we choose this architecture?",
  "What decisions were made in the last sprint?",
  "Summarize the latest PR discussions",
  "What are the open technical debt items?",
];

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: { type: string; id: string; label: string }[];
}

export default function ChatPage() {
  const params = useParams();
  const [messages, setMessages] = useState<ChatMsg[]>(mockMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: ChatMsg = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      sources: [],
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Based on the project history, here's what I found:\n\nThe team discussed this in PR #47 and the Discord #architecture channel on March 15th. The primary reasoning was performance optimization — the existing approach was causing N+1 query issues on the dashboard endpoint. Sarah proposed the refactor in the PR description, and the team agreed after benchmarking showed a 3x improvement in response times.\n\nAlex also noted in Discord that this aligned with the upcoming mobile client requirements, which needed more flexible data fetching patterns.`,
        sources: [
          { type: "pr", id: "47", label: "PR #47" },
          { type: "discord", id: "arch-123", label: "#architecture" },
          { type: "commit", id: "a3f2d1", label: "a3f2d1e" },
        ],
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sourceIcon = (type: string) => {
    switch (type) {
      case "pr": return GitPullRequest;
      case "commit": return GitCommit;
      case "discord": return Hash;
      default: return FileText;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-[#1a1a1a] bg-[#050505]">
        <h1 className="text-[14px] font-medium text-[#fafafa]">Chat Q&A</h1>
        <p className="text-[11px] text-[#525252]">Ask questions about your project with source citations</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-md bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-[#10b981]" strokeWidth={2} />
                </div>
              )}
              <div
                className={`max-w-[85%] ${
                  msg.role === "user"
                    ? "surface-elevated px-4 py-2.5 rounded-lg"
                    : ""
                }`}
              >
                <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "text-[#fafafa]" : "text-[#a3a3a3]"
                }`}>
                  {msg.content}
                </p>
                {msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {msg.sources.map((src) => {
                      const Icon = sourceIcon(src.type);
                      return (
                        <span key={src.id} className="forge-badge forge-badge-accent cursor-pointer hover:bg-[rgba(16,185,129,0.15)] transition-colors">
                          <Icon className="w-3 h-3" strokeWidth={2} />
                          {src.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-md bg-[#171717] border border-[#262626] flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[#525252]" strokeWidth={2} />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-md bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-[#10b981] animate-pulse-subtle" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-1 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#525252] animate-pulse-subtle" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#525252] animate-pulse-subtle" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[#525252] animate-pulse-subtle" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested queries */}
      {messages.length <= 1 && (
        <div className="shrink-0 px-6 pb-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3 py-1.5 rounded-md border border-[#1a1a1a] bg-[#0a0a0a] text-[12px] text-[#737373] hover:text-[#a3a3a3] hover:border-[#262626] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-6 py-3 border-t border-[#1a1a1a] bg-[#050505]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 surface-elevated rounded-lg px-3 py-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your project..."
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#fafafa] placeholder:text-[#404040]"
              disabled={isTyping}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[#525252] hover:text-[#10b981] hover:bg-[rgba(16,185,129,0.08)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[10px] text-[#404040] mt-1.5 text-center">
            Forge cites sources for every answer. Responses may be incomplete.
          </p>
        </div>
      </div>
    </div>
  );
}
