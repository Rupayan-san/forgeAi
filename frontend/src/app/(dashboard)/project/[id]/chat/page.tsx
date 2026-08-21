"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Loader2,
  ChevronDown,
  User,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSourceConfig, summarizeSourceTypes } from "@/lib/sourceTypes";
import { useAuthStore } from "@/store/use-auth-store";
import { AIThinkingBlock } from "@/components/chat/ai-thinking-block";

interface SourceCitation {
  source_type: string;
  source_id: string;
  source_url?: string;
  relevance_score: number;
  content_preview: string;
}

interface ChatMessage {
  message_id: string;
  content: string;
  sources: SourceCitation[];
  created_at: string;
  role: "user" | "assistant";
  trace?: string[];
}

const suggestedQueries = [
  "What's the difference between let and const in JavaScript?",
  "Why did we choose this architecture?",
  "What decisions were made in the last sprint?",
  "Summarize recent PR discussions",
];

function formatMessageTime(isoString?: string): string {
  if (!isoString) {
    return new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  try {
    let s = String(isoString).trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s += "Z";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await api.get<ChatMessage[]>(
          `/projects/${projectId}/chat/history`
        );
        const tagged = (history || []).map((msg, i) => ({
          ...msg,
          role: (msg.role || (i % 2 === 0 ? "user" : "assistant")) as "user" | "assistant",
          sources: msg.sources || [],
        }));
        setMessages(tagged);
      } catch (err) {
        console.error("Failed to load chat history", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    if (projectId) {
      loadHistory();
    }
  }, [projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleSources = (messageId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      message_id: crypto.randomUUID(),
      content: query,
      sources: [],
      created_at: new Date().toISOString(),
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post<{
        message_id: string;
        content: string;
        sources: SourceCitation[];
        created_at: string;
        trace?: string[];
      }>(`/projects/${projectId}/chat`, {
        message: userMessage.content,
        interface_type: "text",
      });

      const assistantMessage: ChatMessage = {
        ...response,
        role: "assistant",
        sources: response.sources || [],
        trace: response.trace || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error", err);
      setMessages((prev) => [
        ...prev,
        {
          message_id: crypto.randomUUID(),
          content: "Sorry, I encountered an error while searching project memory. Please try again.",
          sources: [],
          created_at: new Date().toISOString(),
          role: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] max-h-[calc(100vh-56px)] overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-border bg-card/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/project/${projectId}`}
            className="p-1.5 rounded-sm bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Back to Project"
            aria-label="Back to Project"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-sm bg-card border border-border flex items-center justify-center font-mono font-bold text-xs text-foreground shadow-2xs">
            AI
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold font-mono text-foreground">
              Project AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Knowledge Q&A grounded with source citations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border text-muted-foreground text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            RAG Memory Active
          </span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" strokeWidth={2} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-sm bg-card border border-border flex items-center justify-center mb-3 font-mono font-bold text-sm text-foreground shadow-2xs">
                AI
              </div>
              <h2 className="text-sm sm:text-base font-bold font-mono text-foreground mb-1">
                Ask anything about your codebase & workspace
              </h2>
              <p className="text-muted-foreground text-xs font-mono max-w-sm mb-6">
                Queries are grounded with vector search across code, commits, discussions, and decisions.
              </p>

              {/* Suggested queries */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestedQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 rounded-sm border border-border bg-card text-xs font-mono text-muted-foreground hover:text-foreground hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors cursor-pointer shadow-2xs text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";

              if (isUser) {
                return (
                  /* User Message Block */
                  <div key={msg.message_id} className="flex items-start justify-end gap-3.5 my-4">
                    <div className="bg-white dark:bg-white text-black rounded-sm p-4 sm:p-5 max-w-[85%] sm:max-w-[75%] shadow-md border border-zinc-200">
                      <p className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal text-black">
                        {msg.content}
                      </p>
                      <div className="mt-3 text-[11px] font-mono text-zinc-500 font-medium">
                        {formatMessageTime(msg.created_at)}
                      </div>
                    </div>

                    {/* User Avatar Box */}
                    <div className="w-8 h-8 rounded-sm bg-card border border-border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.github_username || user.name || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : user?.github_username ? (
                        <span className="text-[11px] font-mono font-bold text-foreground">
                          {user.github_username.substring(0, 2).toUpperCase()}
                        </span>
                      ) : (
                        <User className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                );
              }

              /* Assistant Message Block */
              return (
                <div key={msg.message_id} className="flex items-start gap-3.5 my-5">
                  {/* AI Avatar Box */}
                  <div className="w-8 h-8 rounded-sm bg-card border border-border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                      AI
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 max-w-[90%] font-mono">
                    <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap font-normal space-y-2">
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-2.5 text-[11px] font-mono text-muted-foreground font-medium">
                      {formatMessageTime(msg.created_at)}
                    </div>

                    {/* Sources Citations */}
                    {msg.sources && msg.sources.length > 0 && (() => {
                      const uniqueTypes = summarizeSourceTypes(msg.sources.map((s) => s.source_type));
                      const isMultiSource = uniqueTypes.length >= 2;

                      return (
                        <div className="mt-3 pt-3 border-t border-border/60">
                          {isMultiSource && (
                            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/20 w-fit">
                              <Sparkles className="w-3 h-3 text-emerald-500" strokeWidth={2} />
                              <span className="text-[11px] text-emerald-500 font-mono font-medium">
                                Synthesized from {uniqueTypes.join(" + ")}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={() => toggleSources(msg.message_id)}
                            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                expandedSources.has(msg.message_id) ? "rotate-180" : ""
                              }`}
                              strokeWidth={1.5}
                            />
                            <span>
                              {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""} cited
                              {isMultiSource ? ` across ${uniqueTypes.length} types` : ""}
                            </span>
                          </button>

                          {expandedSources.has(msg.message_id) && (
                            <div className="mt-2 space-y-2">
                              {msg.sources.map((source, i) => {
                                const config = getSourceConfig(source.source_type);
                                const Icon = config.icon;
                                return (
                                  <div
                                    key={i}
                                    className="p-2.5 rounded-sm bg-card border border-border text-xs flex items-start gap-2.5 font-mono shadow-2xs"
                                  >
                                    <div
                                      className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                                      style={{ background: `${config.color}15` }}
                                    >
                                      <Icon className="w-3 h-3" style={{ color: config.color }} strokeWidth={1.5} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                          style={{ background: `${config.color}15`, color: config.color }}
                                        >
                                          {config.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                          {Math.round(source.relevance_score * 100)}% match
                                        </span>
                                      </div>
                                      <span className="text-foreground font-mono text-[11px] font-medium truncate block mt-1">
                                        {source.source_id}
                                      </span>
                                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                        {source.content_preview}
                                      </p>
                                      {source.source_url && (
                                        <a
                                          href={source.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-emerald-500 hover:underline mt-1 inline-block"
                                        >
                                          View source →
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}

          {/* AI Thinking Block while loading */}
          {isLoading && (
            <div className="flex items-start gap-3.5 my-5">
              <div className="w-8 h-8 rounded-sm bg-card border border-border flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                <span className="font-mono font-bold text-xs text-foreground tracking-tight">
                  AI
                </span>
              </div>
              <div className="flex-1 max-w-[88%]">
                <AIThinkingBlock
                  query={messages.filter((m) => m.role === "user").slice(-1)[0]?.content}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 shadow-2xs focus-within:border-ring transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your project..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-3.5 py-1.5 rounded-md bg-foreground text-background hover:opacity-90 font-mono text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-2 text-center">
            Forge AI grounding: Vector search across code, commits, decisions, & chat history.
          </p>
        </div>
      </div>
    </div>
  );
}
