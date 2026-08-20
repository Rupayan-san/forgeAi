"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Loader2,
  FileCode2,
  Hash,
  ChevronDown,
  Bot,
  User,
} from "lucide-react";
import { api } from "@/lib/api";

interface SourceCitation {
  source_type: string;
  source_id: string;
  source_url: string;
  relevance_score: number;
  content_preview: string;
}

interface ChatMessage {
  message_id: string;
  content: string;
  sources: SourceCitation[];
  created_at: string;
  role: "user" | "assistant";
}

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
        // Tag messages with roles based on their position (alternating user/assistant)
        const tagged = history.map((msg, i) => ({
          ...msg,
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        }));
        setMessages(tagged);
      } catch (err) {
        console.error("Failed to load chat history", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [projectId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      message_id: crypto.randomUUID(),
      content: input.trim(),
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
      }>(`/projects/${projectId}/chat`, {
        message: userMessage.content,
        interface_type: "text",
      });

      const assistantMessage: ChatMessage = {
        ...response,
        role: "assistant",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error", err);
      setMessages((prev) => [
        ...prev,
        {
          message_id: crypto.randomUUID(),
          content: "Sorry, something went wrong. Please try again.",
          sources: [],
          created_at: new Date().toISOString(),
          role: "assistant",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (type: string) => {
    if (type === "discord_message") return Hash;
    return FileCode2;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-1px)]">
      {/* Header */}
      <div className="shrink-0 px-8 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <h1 className="text-lg font-semibold text-white">Chat Q&A</h1>
        <p className="text-xs text-[rgba(255,255,255,0.4)]">
          Ask questions about your project — answers are grounded in your code
          and conversations.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              className="w-6 h-6 text-[#6366F1] animate-spin"
              strokeWidth={1.5}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-[#818CF8]" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Ask anything about your project
            </h2>
            <p className="text-sm text-[rgba(255,255,255,0.4)] max-w-md">
              Try questions like &quot;How does authentication work?&quot; or
              &quot;What did the team discuss about the database schema?&quot;
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.15)] flex items-center justify-center shrink-0 mt-1">
                  <Bot
                    className="w-4 h-4 text-[#818CF8]"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              <div
                className={`max-w-[75%] ${
                  msg.role === "user"
                    ? "bg-[#6366F1] rounded-2xl rounded-br-md px-4 py-3"
                    : "glass rounded-2xl rounded-bl-md px-4 py-3"
                }`}
              >
                <p
                  className={`text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "text-white"
                      : "text-[rgba(255,255,255,0.85)]"
                  }`}
                >
                  {msg.content}
                </p>

                {/* Sources */}
                {msg.role === "assistant" && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                    <button
                      onClick={() => toggleSources(msg.message_id)}
                      className="flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.4)] hover:text-[#818CF8] transition-colors"
                    >
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          expandedSources.has(msg.message_id)
                            ? "rotate-180"
                            : ""
                        }`}
                        strokeWidth={1.5}
                      />
                      {msg.sources.length} source
                      {msg.sources.length !== 1 ? "s" : ""}
                    </button>

                    {expandedSources.has(msg.message_id) && (
                      <div className="mt-2 space-y-1.5">
                        {msg.sources.map((source, i) => {
                          const Icon = getSourceIcon(source.source_type);
                          return (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 rounded-lg bg-[rgba(0,0,0,0.2)] text-xs"
                            >
                              <Icon
                                className="w-3.5 h-3.5 text-[#818CF8] shrink-0 mt-0.5"
                                strokeWidth={1.5}
                              />
                              <div className="min-w-0">
                                <p className="text-[rgba(255,255,255,0.6)] font-medium truncate">
                                  {source.source_type === "github_file"
                                    ? source.source_id
                                    : `Discord: ${source.source_id}`}
                                </p>
                                <p className="text-[rgba(255,255,255,0.3)] truncate mt-0.5">
                                  {source.content_preview}
                                </p>
                              </div>
                              <span className="text-[rgba(255,255,255,0.2)] shrink-0">
                                {Math.round(source.relevance_score * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0 mt-1">
                  <User
                    className="w-4 h-4 text-[rgba(255,255,255,0.6)]"
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(99,102,241,0.15)] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[#818CF8]" strokeWidth={1.5} />
            </div>
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2
                  className="w-4 h-4 text-[#818CF8] animate-spin"
                  strokeWidth={1.5}
                />
                <span className="text-sm text-[rgba(255,255,255,0.4)]">
                  Searching your project knowledge...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-8 py-4 border-t border-[rgba(255,255,255,0.06)]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your project..."
            disabled={isLoading}
            className="flex-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#6366F1] transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-colors disabled:opacity-50 disabled:hover:bg-[#6366F1]"
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
