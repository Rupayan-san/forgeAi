"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Loader2,
  ChevronDown,
  Zap,
  User,
  Bot,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { getSourceConfig, summarizeSourceTypes } from "@/lib/sourceTypes";
import EnterpriseAIPipeline from "@/components/ui/ai-agent-pipeline";

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
  "Why did we choose this architecture?",
  "What decisions were made in the last sprint?",
  "Summarize the latest PR discussions",
  "What are the open technical debt items?",
];

export default function ChatPage() {
  const params = useParams();
  const projectId = params.id as string;

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
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-[#050505]">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-[#1a1a1a] bg-[#050505]">
        <h1 className="text-[14px] font-medium text-[#fafafa]">Chat Q&A</h1>
        <p className="text-[11px] text-[#525252]">
          Ask questions about your project — answers are grounded with source citations.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#1a1a1a] flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-[#10b981]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[14px] font-semibold text-[#fafafa] mb-1">
                Ask anything about your project
              </h2>
              <p className="text-[#525252] text-[12px] max-w-sm mb-6">
                Try asking about architectural decisions, recent PR discussions, or commit history.
              </p>

              {/* Suggested queries */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
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
          ) : (
            messages.map((msg) => (
              <div
                key={msg.message_id}
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
                  <p
                    className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user" ? "text-[#fafafa]" : "text-[#a3a3a3]"
                    }`}
                  >
                    {msg.content}
                  </p>

                  {/* Real agent trace — only show for assistant messages that have one */}
                  {msg.role === "assistant" && msg.trace && msg.trace.length > 0 && (
                    <details className="mt-2 mb-1 group">
                      <summary className="cursor-pointer text-[11px] text-[#525252] hover:text-[#10b981] transition-colors list-none flex items-center gap-1.5">
                        <Bot className="w-3 h-3" strokeWidth={2} />
                        <span>View agent reasoning trace</span>
                      </summary>
                      <div className="mt-2">
                        <EnterpriseAIPipeline messages={msg.trace} className="!max-w-full" />
                      </div>
                    </details>
                  )}

                  {/* Sources */}
                  {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (() => {
                    const uniqueTypes = summarizeSourceTypes(msg.sources.map((s) => s.source_type));
                    const isMultiSource = uniqueTypes.length >= 2;

                    return (
                      <div className="mt-2.5 pt-2.5 border-t border-white/5">
                        {/* "Synthesized from X + Y" badge — only shows when 2+ distinct source types */}
                        {isMultiSource && (
                          <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.15)] w-fit">
                            <Sparkles className="w-3 h-3 text-[#10b981]" strokeWidth={2} />
                            <span className="text-[11px] text-[#10b981] font-medium">
                              Synthesized from {uniqueTypes.join(" + ")}
                            </span>
                          </div>
                        )}

                        <button
                          onClick={() => toggleSources(msg.message_id)}
                          className="flex items-center gap-1.5 text-[11px] text-[#525252] hover:text-[#10b981] transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              expandedSources.has(msg.message_id) ? "rotate-180" : ""
                            }`}
                            strokeWidth={1.5}
                          />
                          <span>
                            {msg.sources.length} source{msg.sources.length !== 1 ? "s" : ""} cited
                            {isMultiSource ? ` across ${uniqueTypes.length} sources` : ""}
                          </span>
                        </button>

                        {expandedSources.has(msg.message_id) && (
                          <div className="mt-2 space-y-1.5">
                            {msg.sources.map((source, i) => {
                              const config = getSourceConfig(source.source_type);
                              const Icon = config.icon;
                              return (
                                <div
                                  key={i}
                                  className="p-2 rounded-md bg-[#0a0a0a] border border-[#1a1a1a] text-xs flex items-start gap-2"
                                >
                                  <div
                                    className="w-5 h-5 rounded flex items-center justify-center shrink-0"
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
                                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                        {Math.round(source.relevance_score * 100)}% match
                                      </span>
                                    </div>
                                    <span className="text-zinc-300 font-mono text-[11px] font-medium truncate block mt-1">
                                      {source.source_id}
                                    </span>
                                    {source.content_preview && (
                                      <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-2 leading-snug">
                                        {source.content_preview}
                                      </p>
                                    )}
                                    {source.source_url && (
                                      <a
                                        href={source.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-[#10b981] hover:underline mt-1 inline-block"
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

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-md bg-[#171717] border border-[#262626] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#525252]" strokeWidth={2} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing / Loading indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-md bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.15)] flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-3.5 h-3.5 text-[#10b981] animate-pulse-subtle" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 text-[#10b981] animate-spin" strokeWidth={2} />
                <span className="text-xs text-[#525252] font-mono">Searching project memory...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested queries on bottom if few messages */}
      {messages.length > 0 && messages.length <= 2 && (
        <div className="shrink-0 px-6 pb-2">
          <div className="max-w-2xl mx-auto">
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.slice(0, 2).map((q) => (
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

      {/* Input Form */}
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
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-7 h-7 rounded-md flex items-center justify-center text-[#525252] hover:text-[#10b981] hover:bg-[rgba(16,185,129,0.08)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
          <p className="text-[10px] text-[#404040] mt-1.5 text-center">
            Forge cites sources for every answer. Responses are grounded in your repository & chat data.
          </p>
        </div>
      </div>
    </div>
  );
}
