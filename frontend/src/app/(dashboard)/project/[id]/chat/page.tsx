"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Loader2,
  ChevronDown,
  Bot,
  Wifi,
  WifiOff,
  ScrollText,
  Users,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";
import { ChatMessage, SourceCitation } from "@/types";

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Recently";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Recently";
  }
}

export default function UnifiedChatPage() {
  const params = useParams();
  const projectId = params.id as string;

  const { user, token } = useAuthStore();
  const { currentProject, fetchProject } = useProjectStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "reconnecting" | "disconnected">("connecting");
  const [aiThinking, setAiThinking] = useState<{ active: boolean; aiName: string } | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const aiName = currentProject?.ai_config?.name || "Forge";
  const aiInvocation = currentProject?.ai_config?.invocation_phrase || aiName;

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId, true);
      api
        .get<ChatMessage[]>(`/projects/${projectId}/chat/messages?limit=60`)
        .then((data) => setMessages(data || []))
        .catch((err) => console.error("Failed to load chat history:", err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [projectId, fetchProject]);

  const connectWebSocketRef = useRef<() => void>(() => {});

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    if (!projectId || !token) return;

    // Build WS URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^http(s)?:\/\//, "")
      : "localhost:8000";

    const wsUrl = `${protocol}//${host}/api/v1/projects/${projectId}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message" && payload.data) {
          const newMsg: ChatMessage = payload.data;
          setMessages((prev) => {
            // Deduplicate by message_id
            if (prev.some((m) => m.message_id === newMsg.message_id || (newMsg.id && m.id === newMsg.id))) {
              return prev;
            }
            return [...prev, newMsg];
          });
          if (newMsg.role === "assistant") {
            setAiThinking(null);
          }
        } else if (payload.type === "ai_thinking") {
          setAiThinking({ active: true, aiName: payload.ai_name || "Forge" });
        } else if (payload.type === "presence") {
          if (payload.online_count) {
            setOnlineCount(payload.online_count);
          }
        }
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      socketRef.current = null;
      // Attempt reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        setConnectionStatus("reconnecting");
        connectWebSocketRef.current();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      ws.close();
    };
  }, [projectId, token]);

  useEffect(() => {
    connectWebSocketRef.current = connectWebSocket;
  }, [connectWebSocket]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiThinking]);

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

  const handleSend = async (textOverride?: string) => {
    const messageText = (textOverride || input).trim();
    if (!messageText || isSending) return;

    setIsSending(true);
    setInput("");

    // Check if WebSocket is open
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ content: messageText }));
      setIsSending(false);
    } else {
      // Fallback to REST endpoint
      try {
        const sentMsg = await api.post<ChatMessage>(`/projects/${projectId}/chat/messages`, {
          content: messageText,
        });
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === sentMsg.message_id)) return prev;
          return [...prev, sentMsg];
        });
      } catch (err) {
        console.error("Failed to send message via REST fallback:", err);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQueries = [
    `@${aiInvocation} what is our Project Constitution stack?`,
    `@${aiInvocation} what are our Git branch and commit rules?`,
    `@${aiInvocation} explain our service architecture rules`,
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-[#050505]">
      {/* Header */}
      <div className="shrink-0 px-6 py-3 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/project/${projectId}`}
            className="p-1 rounded text-[#737373] hover:text-[#fafafa] hover:bg-[#141414] transition-colors"
            title="Back to Project Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[14px] font-semibold text-[#fafafa]">
                {currentProject?.name || "Project"} — Unified Chat
              </h1>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.25 rounded border border-emerald-500/20">
                <Bot className="w-3 h-3" />
                @{aiInvocation}
              </span>
            </div>
            <p className="text-[11px] text-[#525252]">
              Team collaboration with embedded Project Memory & Constitution grounding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/project/${projectId}/constitution`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] text-[#a3a3a3] hover:text-[#fafafa] bg-[#111] border border-[#262626] transition-colors"
          >
            <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Constitution</span>
          </Link>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#111] border border-[#222]">
            {connectionStatus === "connected" ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Live ({onlineCount})</span>
              </>
            ) : connectionStatus === "reconnecting" ? (
              <>
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400">Reconnecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-[#737373]" />
                <span className="text-[#737373]">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-[#10b981] animate-spin" strokeWidth={2} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center mb-3 text-[#10b981]">
                <Users className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-semibold text-[#fafafa] mb-1">
                Welcome to #{currentProject?.name || "Project"} Chat
              </h2>
              <p className="text-[#737373] text-[12px] max-w-md mb-6">
                Send messages to your teammates, or type <strong className="text-emerald-400 font-mono">@{aiInvocation}</strong> to
                consult the AI assistant with Project Constitution rules and vector memory.
              </p>

              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 rounded-md border border-[#1f1f1f] bg-[#0d0d0d] text-[12px] text-[#a3a3a3] hover:text-[#fafafa] hover:border-[#333] transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === "assistant" || msg.is_ai_generated;
              const isMine = msg.user_id === user?.user_id;

              return (
                <div
                  key={msg.message_id || msg.id}
                  className={`flex gap-3 ${isMine && !isAssistant ? "justify-end" : "justify-start"}`}
                >
                  {/* Assistant Avatar */}
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 text-[#10b981]">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`max-w-[85%] ${
                      isAssistant
                        ? "p-4 rounded-xl bg-gradient-to-br from-[#0e0e0e] to-[#080808] border border-emerald-500/20 text-[#fafafa]"
                        : isMine
                          ? "p-3.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-[#fafafa]"
                          : "p-3.5 rounded-xl bg-[#111111] border border-[#222222] text-[#fafafa]"
                    }`}
                  >
                    {/* Header: Sender Name & Timestamp */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[12px] font-semibold ${
                          isAssistant ? "text-emerald-400" : isMine ? "text-emerald-300" : "text-[#fafafa]"
                        }`}
                      >
                        {isAssistant ? `${aiName} (AI Assistant)` : msg.user_name || msg.user_id}
                      </span>
                      {msg.is_ai_invocation && !isAssistant && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1 py-0.25 rounded font-mono">
                          AI Mention
                        </span>
                      )}
                      <span className="text-[10px] text-[#525252] font-mono">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Source Citations for AI Assistant */}
                    {isAssistant && msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5">
                        <button
                          onClick={() => toggleSources(msg.message_id)}
                          className="flex items-center gap-1.5 text-[11px] text-[#737373] hover:text-[#10b981] transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3 h-3 transition-transform ${
                              expandedSources.has(msg.message_id) ? "rotate-180" : ""
                            }`}
                          />
                          <span>
                            {msg.sources.length} cited source{msg.sources.length !== 1 ? "s" : ""} (including
                            Constitution & Knowledge Base)
                          </span>
                        </button>

                        {expandedSources.has(msg.message_id) && (
                          <div className="mt-2 space-y-2">
                            {msg.sources.map((src: SourceCitation, i: number) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-lg bg-[#080808] border border-[#1c1c1c] text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-emerald-400 font-medium">
                                    [{src.source_type.toUpperCase()}] {src.source_id}
                                  </span>
                                  <span className="text-[10px] text-[#737373] font-mono">
                                    {Math.round(src.relevance_score * 100)}% match
                                  </span>
                                </div>
                                {src.content_preview && (
                                  <p className="text-[#a3a3a3] line-clamp-2">{src.content_preview}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Human User Avatar */}
                  {!isAssistant && !isMine && (
                    <div className="w-7 h-7 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-white font-bold">
                      {(msg.user_name || "??").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* AI Thinking State */}
          {aiThinking?.active && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-950/10 border border-emerald-500/20 max-w-[85%]">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-[#10b981] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[12px] font-semibold text-emerald-400">{aiThinking.aiName}</span>
                <p className="text-[11px] text-[#a3a3a3] mt-0.5 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[#10b981]" />
                  Reviewing Project Constitution rules & memory...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Composer */}
      <div className="shrink-0 px-6 py-3 border-t border-[#1a1a1a] bg-[#080808]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 surface-elevated rounded-xl p-2 bg-[#0c0c0c] border border-[#222]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message team, or type @${aiInvocation} to ask AI assistant...`}
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#fafafa] placeholder:text-[#525252] px-2"
              disabled={isSending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isSending}
              className="px-3 py-1.5 rounded-lg bg-[#10b981] text-white hover:bg-[#059669] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 text-[12px] font-medium shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#525252] mt-1.5 px-1">
            <span>
              Tip: Mention <code className="text-emerald-400 font-mono">@{aiInvocation}</code> anywhere to get
              Constitution-grounded answers.
            </span>
            <span>{connectionStatus === "connected" ? "Realtime Active" : "Connecting..."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
