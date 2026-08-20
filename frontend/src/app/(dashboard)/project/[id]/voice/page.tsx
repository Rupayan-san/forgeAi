"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Mic, MicOff, Phone, PhoneOff, Users, Loader2 } from "lucide-react";
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
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
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
          if (lastLine && !lastLine.isFinal && lastLine.speaker === user?.name) {
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
          if (lastLine && !lastLine.isFinal && lastLine.speaker === user?.name) {
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
      // If the meeting is still active and not muted, try to restart recognition
      // because sometimes it stops automatically.
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
    
    // Send transcript to group chat and for summarization
    const fullTranscript = transcripts
      .filter(t => t.isFinal)
      .map(t => `${t.speaker}: ${t.text}`)
      .join("\n");

    if (!fullTranscript.trim()) return;
    
    setIsProcessing(true);
    try {
      // Send to group chat as a meeting summary
      await api.post(`/projects/${projectId}/group-chat`, {
        content: `🎙️ Voice Meeting Transcript:\n\n${fullTranscript}`
      });
      
      // Optionally could hit a dedicated meeting summary endpoint
      // await api.post(`/projects/${projectId}/voice/meeting/end`, { transcript: fullTranscript });
      
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
        <h1 className="text-2xl font-bold text-white mb-4">Voice Meeting</h1>
        <div className="glass p-8 text-center">
          <p className="text-[rgba(255,255,255,0.7)]">
            Your browser does not support the Web Speech API. Please use Chrome or Edge.
          </p>
        </div>
      </div>
    );
  }

  // Determine participants (Current user + some mock/real members)
  const members = currentProject?.members || [];
  const participants = [user?.name || "Me", ...members.filter(m => m !== user?.github_username && m !== user?.user_id).slice(0, 4)];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-h-screen">
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] flex justify-between items-center">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#6366F1]" />
          Voice Meeting Room - {currentProject?.name}
        </h1>
        
        {isMeetingActive ? (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-2.5 rounded-xl transition-colors ${
                isMuted 
                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30" 
                  : "bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.15)] border border-transparent"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={endMeeting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
            >
              <PhoneOff className="w-4 h-4" />
              End Meeting
            </button>
          </div>
        ) : (
          <button
            onClick={startMeeting}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
            Host Meeting
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Participants Grid */}
        <div className="w-1/3 min-w-[300px] border-r border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.1)] p-6 overflow-y-auto">
          <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] uppercase tracking-wider mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participants ({isMeetingActive ? participants.length : 0})
          </h2>
          
          {isMeetingActive ? (
            <div className="grid grid-cols-2 gap-4">
              {participants.map((p, i) => {
                const isMe = i === 0;
                return (
                  <div key={p} className="aspect-square glass rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-0" />
                    
                    {/* Speaking indicator for "Me" if not muted */}
                    {isMe && !isMuted && (
                      <div className="absolute inset-0 border-2 border-[#6366F1] rounded-2xl animate-pulse z-10" />
                    )}

                    <div className="w-16 h-16 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-xl text-white font-medium z-10 mb-2">
                      {p.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-white font-medium z-10 truncate px-2 max-w-full">
                      {p} {isMe ? "(You)" : ""}
                    </span>
                    
                    {isMe && isMuted && (
                      <div className="absolute top-3 right-3 z-10 bg-black/50 p-1.5 rounded-full text-red-400">
                        <MicOff className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <PhoneOff className="w-12 h-12 text-[rgba(255,255,255,0.1)] mb-4" />
              <p className="text-[rgba(255,255,255,0.4)] text-sm">
                No active meeting.<br />Host a meeting to invite your team.
              </p>
            </div>
          )}
        </div>

        {/* Live Transcript */}
        <div className="flex-1 flex flex-col bg-[rgba(0,0,0,0.2)]">
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.1)]">
            <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.7)] uppercase tracking-wider">
              Live Transcript
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!isMeetingActive && transcripts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[rgba(255,255,255,0.4)]">
                Start the meeting to see the live transcript.
              </div>
            ) : transcripts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[rgba(255,255,255,0.4)]">
                Listening...
              </div>
            ) : (
              transcripts.map((t) => (
                <div key={t.id} className={`flex flex-col ${t.speaker === user?.name || t.speaker === "Me" ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-[rgba(255,255,255,0.4)] mb-1 ml-1">
                    {t.speaker} • {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] ${
                    t.speaker === user?.name || t.speaker === "Me"
                      ? "bg-[#6366F1]/20 text-white border border-[#6366F1]/30 rounded-br-sm" 
                      : "bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(255,255,255,0.1)] rounded-bl-sm"
                  } ${!t.isFinal ? "opacity-70 italic" : ""}`}>
                    <p className="text-sm whitespace-pre-wrap">{t.text}</p>
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
