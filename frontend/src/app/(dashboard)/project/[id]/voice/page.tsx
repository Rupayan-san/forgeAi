"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  Loader2,
  Volume2,
  Bot,
  Sparkles,
  CheckCircle2,
  Circle,
  Plus,
  FileText,
  HelpCircle,
  ListTodo,
  Calendar,
  Layers,
  Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";
import {
  Meeting,
  TranscriptSegment,
  MeetingSummary,
  ActionItem,
} from "@/types";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [key: number]: {
      isFinal: boolean;
      [key: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface AISourceCitation {
  title?: string;
  source_type?: string;
}

export default function VoiceMeetingPage() {
  const { id: projectId } = useParams() as { id: string };
  const { token } = useAuthStore();
  const { currentProject } = useProjectStore();

  // Meeting State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [isMeetingLive, setIsMeetingLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  // Live Collaboration State
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState("");
  const [aiState, setAiState] = useState<"IDLE" | "LISTENING" | "THINKING" | "SPEAKING">("IDLE");
  const [aiResponses, setAiResponses] = useState<
    Array<{ id: string; content: string; sources?: AISourceCitation[]; timestamp: string }>
  >([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [meetingSummary, setMeetingSummary] = useState<MeetingSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"transcript" | "actions" | "summary">("transcript");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load project meetings and action items
  useEffect(() => {
    async function loadData() {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const [mList, aList] = await Promise.all([
          api.get<Meeting[]>(`/projects/${projectId}/meetings`),
          api.get<ActionItem[]>(`/projects/${projectId}/actions`),
        ]);
        setMeetings(mList || []);
        setActionItems(aList || []);

        // Select live meeting or latest
        const live = mList?.find((m) => m.status === "LIVE");
        if (live) {
          setActiveMeeting(live);
          setIsMeetingLive(true);
        } else if (mList && mList.length > 0) {
          setActiveMeeting(mList[0]);
        }
      } catch (err) {
        console.error("Failed to load meetings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  // Load transcripts & summary when active meeting changes
  useEffect(() => {
    async function loadMeetingDetails() {
      if (!activeMeeting) return;
      try {
        const [tSegments, sData] = await Promise.allSettled([
          api.get<TranscriptSegment[]>(`/meetings/${activeMeeting.meeting_id}/transcripts`),
          api.get<MeetingSummary>(`/meetings/${activeMeeting.meeting_id}/summary`),
        ]);

        if (tSegments.status === "fulfilled") {
          setTranscripts(tSegments.value || []);
        }
        if (sData.status === "fulfilled" && sData.value) {
          setMeetingSummary(sData.value);
        } else {
          setMeetingSummary(null);
        }
      } catch (err) {
        console.error("Failed loading meeting transcripts:", err);
      }
    }
    loadMeetingDetails();
  }, [activeMeeting]);

  // Setup WebSocket connection for live meeting
  useEffect(() => {
    if (!activeMeeting || !isMeetingLive || !token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:8000/api/v1/meetings/${activeMeeting.meeting_id}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[MeetingWS] Connected to live meeting:", activeMeeting.meeting_id);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "transcript" && payload.data) {
          setTranscripts((prev) => [...prev, payload.data]);
        } else if (payload.type === "ai_state") {
          setAiState(payload.state);
        } else if (payload.type === "ai_response") {
          setAiResponses((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              content: payload.content,
              sources: payload.sources,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else if (payload.type === "meeting_status" && payload.status === "ENDED") {
          setIsMeetingLive(false);
          // Refresh summary
          api.get<MeetingSummary>(`/meetings/${activeMeeting.meeting_id}/summary`).then((summary) => {
            if (summary) setMeetingSummary(summary);
          });
        }
      } catch (e) {
        console.error("[MeetingWS] Message parse error:", e);
      }
    };

    ws.onclose = () => {
      console.log("[MeetingWS] Disconnected");
    };

    return () => {
      ws.close();
    };
  }, [activeMeeting, isMeetingLive, token]);

  // Speech recognition setup
  useEffect(() => {
    const win = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
    const SpeechRecognitionClass = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => SpeechRecognition)
      | undefined;

    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (final.trim() && activeMeeting && isMeetingLive) {
        setInterimText("");
        // Send final segment over WebSocket or REST fallback
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "transcript",
              text: final.trim(),
              is_final: true,
            })
          );
        } else {
          api.post(`/meetings/${activeMeeting.meeting_id}/transcripts`, {
            text: final.trim(),
            is_final: true,
          });
        }
      }
    };

    recognition.onend = () => {
      if (isMeetingLive && !isMuted && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [activeMeeting, isMeetingLive, isMuted]);

  // Auto scroll transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, interimText, aiResponses]);

  // Meeting actions
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.post<Meeting>(`/projects/${projectId}/meetings`, {
        title: newTitle.trim(),
      });
      setMeetings((prev) => [created, ...prev]);
      setActiveMeeting(created);
      setNewTitle("");
      setIsCreating(false);
    } catch (err) {
      console.error("Failed to create meeting:", err);
    }
  };

  const handleStartMeeting = async () => {
    if (!activeMeeting) return;
    try {
      const started = await api.post<Meeting>(`/meetings/${activeMeeting.meeting_id}/start`);
      setActiveMeeting(started);
      setIsMeetingLive(true);
      setIsMuted(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    } catch (err) {
      console.error("Failed to start meeting:", err);
    }
  };

  const handleEndMeeting = async () => {
    if (!activeMeeting) return;
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const ended = await api.post<Meeting>(`/meetings/${activeMeeting.meeting_id}/end`);
      setActiveMeeting(ended);
      setIsMeetingLive(false);
      setActiveTab("summary");
    } catch (err) {
      console.error("Failed to end meeting:", err);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      try {
        recognitionRef.current?.start();
      } catch {}
    } else {
      setIsMuted(true);
      recognitionRef.current?.stop();
    }
  };

  const toggleActionStatus = async (action: ActionItem) => {
    const nextStatus = action.status === "DONE" ? "TODO" : "DONE";
    try {
      const updated = await api.patch<ActionItem>(`/actions/${action.action_id}`, {
        status: nextStatus,
      });
      setActionItems((prev) =>
        prev.map((a) => (a.action_id === action.action_id ? updated : a))
      );
    } catch (err) {
      console.error("Failed to update action item:", err);
    }
  };

  const aiName = currentProject?.ai_config?.name || "Forge";

  return (
    <div className="flex h-full w-full bg-[#0a0a0a] text-[#ededed] overflow-hidden">
      {/* Left Sidebar: Meetings List */}
      <div className="w-80 border-r border-[#262626] flex flex-col bg-[#111111] shrink-0">
        <div className="p-4 border-b border-[#262626] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#fafafa] flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400" />
              Project Meetings
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">Real-time voice & intelligence</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded-md bg-[#262626] hover:bg-[#333333] text-[#fafafa] transition-colors"
            title="Schedule Meeting"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateMeeting} className="p-3 border-b border-[#262626] bg-[#171717]">
            <input
              type="text"
              placeholder="Meeting Title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded bg-[#0a0a0a] border border-[#333333] text-[#fafafa] focus:outline-none focus:border-emerald-500 mb-2"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs px-2 py-1 text-[#737373] hover:text-[#a3a3a3]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                Create
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {isLoading ? (
            <div className="flex items-center justify-center p-8 text-xs text-[#737373]">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading meetings...
            </div>
          ) : meetings.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#737373]">
              No meetings found.<br />Create one to start collaborating.
            </div>
          ) : (
            meetings.map((m) => {
              const isSelected = activeMeeting?.meeting_id === m.meeting_id;
              const isLive = m.status === "LIVE";
              return (
                <div
                  key={m.meeting_id}
                  onClick={() => {
                    setActiveMeeting(m);
                    setIsMeetingLive(m.status === "LIVE");
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-[#1c1c1c] border-emerald-500/40 shadow-sm"
                      : "bg-[#141414] border-[#262626] hover:bg-[#181818]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#fafafa] truncate max-w-[160px]">
                      {m.title}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        isLive
                          ? "bg-emerald-500/20 text-emerald-400 animate-pulse border border-emerald-500/40"
                          : m.status === "ENDED"
                          ? "bg-[#262626] text-[#888888]"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#737373]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {m.participants.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(m.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Meeting Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0d0d0d]">
        {activeMeeting ? (
          <>
            {/* Meeting Top Bar */}
            <div className="h-16 border-b border-[#262626] px-6 flex items-center justify-between bg-[#111111] shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isMeetingLive
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                      : "bg-[#404040]"
                  }`}
                />
                <div>
                  <h1 className="text-sm font-semibold text-[#fafafa] flex items-center gap-2">
                    {activeMeeting.title}
                  </h1>
                  <p className="text-[11px] text-[#737373]">
                    Channel: <span className="font-mono text-[#a3a3a3]">{activeMeeting.channel_name}</span>
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {isMeetingLive ? (
                  <>
                    <button
                      onClick={toggleMute}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isMuted
                          ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                          : "bg-[#262626] text-[#fafafa] hover:bg-[#333333]"
                      }`}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                    <button
                      onClick={handleEndMeeting}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      End Meeting
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartMeeting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Start / Join Meeting
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-[#262626] bg-[#111111] px-6 gap-6 text-xs shrink-0">
              <button
                onClick={() => setActiveTab("transcript")}
                className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "transcript"
                    ? "border-emerald-500 text-[#fafafa]"
                    : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Live Transcripts & AI
              </button>
              <button
                onClick={() => setActiveTab("actions")}
                className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "actions"
                    ? "border-emerald-500 text-[#fafafa]"
                    : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                Action Items ({actionItems.length})
              </button>
              <button
                onClick={() => setActiveTab("summary")}
                className={`py-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === "summary"
                    ? "border-emerald-500 text-[#fafafa]"
                    : "border-transparent text-[#737373] hover:text-[#a3a3a3]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Meeting Summary
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "transcript" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  {/* Transcripts Column */}
                  <div className="lg:col-span-2 flex flex-col h-full bg-[#141414] rounded-xl border border-[#262626] p-4 overflow-hidden">
                    <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
                      <span className="text-xs font-semibold text-[#fafafa] flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        Live Dialogue Stream
                      </span>
                      {isMeetingLive && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Listening
                        </span>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {transcripts.length === 0 && !interimText ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#737373]">
                          <Mic className="w-8 h-8 mb-2 text-[#404040]" />
                          {isMeetingLive
                            ? "Start speaking. Dialogue is transcribed and analyzed in real time."
                            : "Meeting not started. Click 'Start / Join Meeting' to begin."}
                        </div>
                      ) : (
                        transcripts.map((t) => (
                          <div key={t.segment_id} className="p-2.5 rounded-lg bg-[#1a1a1a] border border-[#282828]">
                            <div className="flex items-center justify-between text-[11px] text-[#737373] mb-1">
                              <span className="font-semibold text-emerald-400">{t.speaker_name}</span>
                              <span>{new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                            </div>
                            <p className="text-xs text-[#ededed] leading-relaxed">{t.text}</p>
                          </div>
                        ))
                      )}

                      {interimText && (
                        <div className="p-2.5 rounded-lg bg-[#1a1a1a]/60 border border-dashed border-[#404040] animate-pulse">
                          <span className="text-[11px] text-[#737373] block mb-1">Speaking...</span>
                          <p className="text-xs text-[#a3a3a3] italic">{interimText}</p>
                        </div>
                      )}

                      <div ref={transcriptEndRef} />
                    </div>
                  </div>

                  {/* AI Participant & State Column */}
                  <div className="flex flex-col space-y-4">
                    {/* Forge AI Card */}
                    <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-semibold text-[#fafafa]">{aiName}</h3>
                            <p className="text-[10px] text-[#737373]">Voice AI Participant</p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            aiState === "SPEAKING"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                              : aiState === "THINKING"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse"
                              : aiState === "LISTENING"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-[#262626] text-[#888888] border-transparent"
                          }`}
                        >
                          {aiState}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888888] leading-relaxed">
                        Say <span className="text-emerald-400 font-mono">&quot;{aiName}, ...&quot;</span> to ask questions about Project Constitution, past Decisions, or architecture.
                      </p>
                    </div>

                    {/* AI Responses History */}
                    <div className="flex-1 bg-[#141414] rounded-xl border border-[#262626] p-4 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-semibold text-[#fafafa] mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        AI Voice Answers
                      </h4>
                      <div className="flex-1 overflow-y-auto space-y-2.5">
                        {aiResponses.length === 0 ? (
                          <div className="p-4 text-center text-xs text-[#737373]">
                            No AI voice responses yet.
                          </div>
                        ) : (
                          aiResponses.map((r) => (
                            <div key={r.id} className="p-3 rounded-lg bg-[#181818] border border-emerald-500/20 text-xs">
                              <p className="text-[#ededed] leading-relaxed mb-2">{r.content}</p>
                              {r.sources && r.sources.length > 0 && (
                                <div className="pt-2 border-t border-[#262626] flex flex-wrap gap-1">
                                  {r.sources.map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#262626] text-emerald-300"
                                    >
                                      {s.title || s.source_type}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "actions" && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
                    <div>
                      <h3 className="text-sm font-semibold text-[#fafafa]">Project Action Items</h3>
                      <p className="text-xs text-[#737373]">Extracted automatically from meeting transcripts</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {actionItems.length === 0 ? (
                      <div className="p-12 text-center text-xs text-[#737373]">
                        No action items recorded for this project yet.
                      </div>
                    ) : (
                      actionItems.map((item) => {
                        const isDone = item.status === "DONE";
                        return (
                          <div
                            key={item.action_id}
                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                              isDone
                                ? "bg-[#141414]/60 border-[#262626] text-[#737373]"
                                : "bg-[#141414] border-[#262626] text-[#ededed] hover:border-[#333333]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleActionStatus(item)}
                                className="mt-0.5 text-emerald-400 hover:text-emerald-300"
                              >
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-[#737373]" />
                                )}
                              </button>
                              <div>
                                <p className={`text-xs font-medium ${isDone ? "line-through" : ""}`}>
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-[11px] text-[#737373] mt-0.5">{item.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[#737373]">
                              {item.assignee_name && (
                                <span className="px-2 py-0.5 rounded bg-[#262626] text-[#a3a3a3]">
                                  @{item.assignee_name}
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-amber-500/10 text-amber-400"
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "summary" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {meetingSummary ? (
                    <div className="space-y-6 bg-[#141414] p-6 rounded-2xl border border-[#262626]">
                      {/* Overview */}
                      <div>
                        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                          Meeting Overview
                        </h3>
                        <p className="text-xs text-[#ededed] leading-relaxed bg-[#1a1a1a] p-3.5 rounded-xl border border-[#262626]">
                          {meetingSummary.overview}
                        </p>
                      </div>

                      {/* Key Points */}
                      {meetingSummary.key_points.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-[#fafafa] mb-2 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            Key Discussion Points
                          </h3>
                          <ul className="space-y-1.5 text-xs text-[#a3a3a3]">
                            {meetingSummary.key_points.map((pt, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-emerald-500">•</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Decisions */}
                      {meetingSummary.decisions.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-[#fafafa] mb-2 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            Decisions Reached
                          </h3>
                          <div className="space-y-2">
                            {meetingSummary.decisions.map((dec, i) => (
                              <div key={i} className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200">
                                {dec}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Unresolved Questions */}
                      {meetingSummary.unresolved_questions.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-[#fafafa] mb-2 flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            Unresolved Questions
                          </h3>
                          <ul className="space-y-1 text-xs text-[#a3a3a3]">
                            {meetingSummary.unresolved_questions.map((q, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-400">?</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-xs text-[#737373] bg-[#141414] rounded-xl border border-[#262626]">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#404040]" />
                      Summary will be automatically generated once the meeting concludes.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#737373]">
            <Phone className="w-10 h-10 mb-3 text-[#404040]" />
            <h2 className="text-sm font-semibold text-[#fafafa] mb-1">No Meeting Selected</h2>
            <p className="text-xs max-w-sm">
              Select an existing meeting from the left sidebar or create a new one to begin real-time voice collaboration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
