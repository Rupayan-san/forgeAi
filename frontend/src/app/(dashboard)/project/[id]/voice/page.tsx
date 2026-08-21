"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  ArrowLeft,
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
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-border bg-card/60 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            href={`/project/${projectId}`}
            className="p-1.5 rounded-md bg-card hover:bg-accent border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 shadow-2xs"
            title="Back to Project"
            aria-label="Back to Project"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              Voice Meeting Room
              {currentProject?.name && <span className="text-muted-foreground font-normal">&bull; {currentProject.name}</span>}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live multi-speaker speech-to-text with auto-extracted decisions
            </p>
          </div>
        </div>

        {isMeetingActive ? (
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                isMuted
                  ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                  : "bg-secondary text-secondary-foreground hover:bg-accent border border-border"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={endMeeting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End Meeting
            </button>
          </div>
        ) : (
          <button
            onClick={startMeeting}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-md transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
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
        <div className="w-1/3 min-w-[280px] max-w-[360px] border-r border-border bg-card/40 p-5 overflow-y-auto">
          <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
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
                    className="aspect-square bg-card border border-border rounded-xl flex flex-col items-center justify-center relative overflow-hidden group p-3 shadow-2xs"
                  >
                    {isMe && !isMuted && (
                      <div className="absolute inset-0 border-2 border-emerald-500 rounded-xl animate-pulse z-10" />
                    )}

                    <div className="w-12 h-12 rounded-full bg-background border border-border flex items-center justify-center text-sm text-foreground font-bold z-10 mb-2">
                      {p.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-foreground font-semibold z-10 truncate px-2 max-w-full text-center">
                      {p} {isMe ? "(You)" : ""}
                    </span>

                    {isMe && isMuted && (
                      <div className="absolute top-2 right-2 z-10 bg-black/60 p-1 rounded-md text-rose-400">
                        <MicOff className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <PhoneOff className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-xs">
                No active meeting.<br />Click Host Meeting to begin.
              </p>
            </div>
          )}
        </div>

        {/* Live Transcript Pane */}
        <div className="flex-1 flex flex-col bg-background">
          <div className="p-3.5 border-b border-border bg-card/60 flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Live Transcript
            </h2>
            {isMeetingActive && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-600 dark:text-emerald-500 font-mono font-medium">Transcribing live</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
            {!isMeetingActive && transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs sm:text-sm">
                Start the meeting to capture and transcribe discussions in real-time.
              </div>
            ) : transcripts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs sm:text-sm">
                <Mic className="w-5 h-5 text-emerald-500 animate-pulse mb-2" />
                Listening... speak into your microphone to record transcript.
              </div>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col ${
                    t.speaker === user?.name || t.speaker === "Me" ? "items-end" : "items-start"
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground mb-1 px-1">
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
