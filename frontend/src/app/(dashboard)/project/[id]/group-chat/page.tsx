"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Send, Users, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";

interface GroupMessage {
  id?: string;
  message_id?: string;
  _id?: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
}

export default function GroupChatPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = await api.get<GroupMessage[]>(`/projects/${id}/group-chat`);
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch group chat messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // In a real app, we would use WebSocket here. For now, we simulate with polling.
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    
    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage(""); // Optimistic clear

    try {
      const msg = await api.post<GroupMessage>(`/projects/${id}/group-chat`, {
        content: messageContent
      });
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setNewMessage(messageContent); // Revert on failure
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] max-h-screen">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)]">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6366F1]" />
            Team Chat - {currentProject?.name || "Project"}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[rgba(255,255,255,0.4)]">
              No messages yet. Be the first to say hello!
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.user_id === user?.user_id;
              const key = msg.id || msg.message_id || msg._id || `${msg.user_id}-${msg.created_at}-${i}`;
              return (
                <div key={key} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-[rgba(255,255,255,0.4)] mb-1 ml-1">
                    {msg.user_name || msg.user_id} • {new Date(msg.created_at).toLocaleTimeString()}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[75%] ${
                    isMine 
                      ? "bg-[#6366F1] text-white rounded-br-sm" 
                      : "bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(255,255,255,0.1)] rounded-bl-sm"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 pt-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message your team..."
              disabled={isSending}
              className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-[#6366F1] transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-[#6366F1] text-white hover:bg-[#4F46E5] disabled:opacity-50 disabled:bg-transparent disabled:text-[rgba(255,255,255,0.3)] transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Sidebar - Members */}
      <div className="w-64 border-l border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.1)] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] uppercase tracking-wider">
            Online Members
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Active project members */}
          {currentProject?.member_details?.map((member, idx) => {
            const isOnline = true; // Simulating all online for now
            return (
              <div key={member.user_id || idx} className="flex items-center gap-3">
                <div className="relative">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.github_username}
                      className="w-8 h-8 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs text-white shrink-0 font-medium">
                      {member.github_username.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{member.github_username}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
