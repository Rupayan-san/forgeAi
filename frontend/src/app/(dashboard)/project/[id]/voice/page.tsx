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
  Clock,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/use-auth-store";
import { useProjectStore } from "@/store/use-project-store";

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

type TranscriptLine = {
  id: string;
  text: string;
  speaker: string;
  isFinal: boolean;
  timestamp: string;
};

export default function VoiceMeetingPage() {
  const { id: projectId } = useParams() as { id: string };
  const { user } = useAuthStore();
  const { currentProject } = useProjectStore();

  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscripts((prev) => {
        const updated = [...prev];
        const lastLineIndex = updated.length - 1;
        const lastLine = lastLineIndex >= 0 ? updated[lastLineIndex] : null;

        if (finalTranscript) {
          if (lastLine && !lastLine.isFinal && lastLine.speaker === (user?.name || "Me")) {
            lastLine.text = finalTranscript;
            lastLine.isFinal = true;
          } else {
            updated.push({
              id: Date.now().toString(),
              text: finalTranscript,
              speaker: user?.name || "Me",
              isFinal: true,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (interimTranscript) {
          if (lastLine && !lastLine.isFinal && lastLine.speaker === (user?.name || "Me")) {
            lastLine.text = interimTranscript;
          } else {
            updated.push({
              id: Date.now().toString(),
              text: interimTranscript,
              speaker: user?.name || "Me",
              isFinal: false,
              timestamp: new Date().toISOString(),
            });
          }
        }
        return updated;
      });
    };

    recognition.onend = () => {
      if (isMeetingActive && !isMuted && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Could not restart recognition:", e);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error", event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [user, isMeetingActive, isMuted]);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const toggleMute = () => {
    if (!recognitionRef.current) return;

    if (isMuted) {
      setIsMuted(false);
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else {
      setIsMuted(true);
      recognitionRef.current.stop();
    }
  };

  const startMeeting = () => {
    setIsMeetingActive(true);
    setTranscripts([]);
    setIsMuted(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const endMeeting = async () => {
    setIsMeetingActive(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const fullTranscript = transcripts
      .filter((t) => t.isFinal)
      .map((t) => `${t.speaker}: ${t.text}`)
      .join("\n");

    if (!fullTranscript.trim()) return;

    setIsProcessing(true);
    try {
      await api.post(`/projects/${projectId}/group-chat`, {
        content: `🎙️ Voice Meeting Transcript:\n\n${fullTranscript}`,
      });
    } catch (err) {
      console.error("Failed to save meeting transcript:", err);
    } finally {
      setIsProcessing(false);
      setTranscripts([]);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold text-[#fafafa] mb-2">Voice Meeting</h1>
        <div className="surface p-6 text-center">
          <p className="text-[#a3a3a3] text-[13px]">
            Your browser does not support the Web Speech API. Please use Google Chrome or Microsoft Edge.
          </p>
        </div>
      </div>
    );
  }

  const members = currentProject?.members || [];
  const participants = [
    user?.name || "Me",
    ...members.filter((m) => m !== user?.github_username && m !== user?.user_id).slice(0, 4),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-[#050505]">
      {/* Header */}
      <div className="shrink-0 px-6 py-3.5 border-b border-[#1a1a1a] bg-[#050505] flex justify-between items-center">
        <div>
          <h1 className="text-[14px] font-medium text-[#fafafa] flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#10b981]" />
            Voice Meeting Room
            {currentProject?.name && <span className="text-[#525252]">· {currentProject.name}</span>}
          </h1>
          <p className="text-[11px] text-[#525252] mt-0.5">
            Real-time meeting audio transcription with automatic decision extraction
          </p>
        </div>

        {isMeetingActive ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                isMuted
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-[#141414] text-white hover:bg-[#1f1f1f] border border-[#262626]"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={endMeeting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium rounded-md transition-colors cursor-pointer"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Meeting
            </button>
          </div>
        ) : (
          <button
            onClick={startMeeting}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-[13px] font-medium rounded-md transition-colors disabled:opacity-40 cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Phone className="w-3.5 h-3.5" />
            )}
            Host Meeting
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Participants Grid */}
        <div className="w-1/3 min-w-[280px] max-w-[360px] border-r border-[#1a1a1a] bg-[#080808] p-5 overflow-y-auto">
          <h2 className="text-[11px] font-mono font-semibold text-[#525252] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Participants ({isMeetingActive ? participants.length : 0})
          </h2>

          {isMeetingActive ? (
            <div className="grid grid-cols-2 gap-3">
              {participants.map((p, i) => {
                const isMe = i === 0;
                return (
                  <div
                    key={p}
                    className="aspect-square surface rounded-xl flex flex-col items-center justify-center relative overflow-hidden group p-3"
                  >
                    {isMe && !isMuted && (
                      <div className="absolute inset-0 border-2 border-[#10b981] rounded-xl animate-pulse z-10" />
                    )}

                    <div className="w-12 h-12 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center text-sm text-[#fafafa] font-medium z-10 mb-2">
                      {p.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[12px] text-[#fafafa] font-medium z-10 truncate px-2 max-w-full text-center">
                      {p} {isMe ? "(You)" : ""}
                    </span>

                    {isMe && isMuted && (
                      <div className="absolute top-2 right-2 z-10 bg-black/60 p-1 rounded-md text-red-400">
                        <MicOff className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <PhoneOff className="w-8 h-8 text-[#262626] mb-3" />
              <p className="text-[#525252] text-[12px]">
                No active meeting.<br />Click Host Meeting to begin.
              </p>
            </div>
          )}
        </div>

        {/* Live Transcript Pane */}
        <div className="flex-1 flex flex-col bg-[#050505]">
          <div className="p-3.5 border-b border-[#1a1a1a] bg-[#080808] flex items-center justify-between">
            <h2 className="text-[11px] font-mono font-semibold text-[#525252] uppercase tracking-wider">
              Live Transcript
            </h2>
            {isMeetingActive && (
              <div className="flex items-center gap-1.5">
                <div className="status-dot status-dot-success animate-pulse" />
                <span className="text-[11px] text-[#10b981] font-mono">Transcribing live</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {!isMeetingActive && transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#525252] text-[13px]">
                Start the meeting to capture and transcribe discussions in real-time.
              </div>
            ) : transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#525252] text-[13px]">
                <Mic className="w-5 h-5 text-[#10b981] animate-pulse mb-2" />
                Listening for speech...
              </div>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col ${
                    t.speaker === user?.name || t.speaker === "Me" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[10px] text-[#525252] mb-1 px-1">
                    {t.speaker} · {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div
                    className={`px-3.5 py-2 rounded-lg max-w-[80%] ${
                      t.speaker === user?.name || t.speaker === "Me"
                        ? "surface-elevated text-[#fafafa] border border-emerald-500/20"
                        : "surface text-[#a3a3a3]"
                    } ${!t.isFinal ? "opacity-60 italic" : ""}`}
                  >
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{t.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={transcriptsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
