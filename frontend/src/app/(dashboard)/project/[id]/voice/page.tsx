"use client";

import { useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  Clock,
  Zap,
  Radio,
} from "lucide-react";

type VoiceState = "idle" | "listening" | "processing";

const mockTranscripts = [
  {
    id: "1",
    question: "What was the reasoning behind the API redesign?",
    answer: "The API redesign was discussed in PR #34 and the #backend Discord channel...",
    duration: "0:42",
    time: "Today, 2:15 PM",
  },
  {
    id: "2",
    question: "Who worked on the authentication module?",
    answer: "Based on commit history, Sarah and Alex primarily worked on the auth module...",
    duration: "0:28",
    time: "Today, 1:30 PM",
  },
  {
    id: "3",
    question: "What are the pending technical decisions?",
    answer: "There are 3 open decisions: database migration timeline, caching strategy, and API versioning...",
    duration: "1:15",
    time: "Yesterday, 4:45 PM",
  },
];

export default function VoicePage() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");

  const handleMicClick = () => {
    if (voiceState === "idle") {
      setVoiceState("listening");
      setTranscript("");
      // Simulate listening
      setTimeout(() => {
        setTranscript("What decisions were made about the database...");
      }, 1000);
      setTimeout(() => {
        setVoiceState("processing");
      }, 3000);
      setTimeout(() => {
        setVoiceState("idle");
        setTranscript("");
      }, 5000);
    } else {
      setVoiceState("idle");
      setTranscript("");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-[#fafafa] tracking-tight">Voice Assistant</h1>
        <p className="text-[#525252] text-[13px] mt-0.5">
          Speak to your project knowledge using Agora Conversational AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice interface */}
        <div className="surface p-8 flex flex-col items-center">
          {/* Status */}
          <div className="flex items-center gap-2 mb-8">
            <div className={`status-dot ${
              voiceState === "idle" ? "status-dot-idle" :
              voiceState === "listening" ? "status-dot-success" :
              "status-dot-warning"
            }`} />
            <span className="text-[12px] text-[#525252] uppercase tracking-wider font-medium">
              {voiceState === "idle" ? "Ready" :
               voiceState === "listening" ? "Listening..." :
               "Processing..."}
            </span>
          </div>

          {/* Mic button */}
          <div className="relative mb-8">
            {voiceState === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full bg-[#10b981] voice-ring" />
                <div className="absolute inset-0 rounded-full bg-[#10b981] voice-ring" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            <button
              onClick={handleMicClick}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                voiceState === "idle"
                  ? "bg-[#111111] border-2 border-[#262626] hover:border-[#10b981] hover:bg-[rgba(16,185,129,0.05)]"
                  : voiceState === "listening"
                  ? "bg-[#10b981] border-2 border-[#10b981]"
                  : "bg-[#111111] border-2 border-[#f59e0b]"
              }`}
            >
              {voiceState === "listening" ? (
                <MicOff className="w-7 h-7 text-white" strokeWidth={1.5} />
              ) : voiceState === "processing" ? (
                <Zap className="w-7 h-7 text-[#f59e0b] animate-pulse-subtle" strokeWidth={1.5} />
              ) : (
                <Mic className="w-7 h-7 text-[#737373]" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Instructions */}
          <p className="text-[12px] text-[#404040] text-center mb-6">
            {voiceState === "idle"
              ? "Click to start speaking"
              : voiceState === "listening"
              ? "Click to stop recording"
              : "Analyzing your question..."}
          </p>

          {/* Waveform visualization */}
          {voiceState === "listening" && (
            <div className="flex items-center gap-[3px] h-8 mb-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[3px] bg-[#10b981] rounded-full"
                  style={{
                    height: `${Math.random() * 24 + 4}px`,
                    opacity: 0.3 + Math.random() * 0.7,
                    animation: `pulse-subtle ${0.5 + Math.random() * 0.5}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 0.5}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Live transcript */}
          {transcript && (
            <div className="w-full surface-inset p-3 rounded-md">
              <p className="text-[11px] text-[#525252] uppercase tracking-wider font-medium mb-1.5">
                Transcript
              </p>
              <p className="text-[13px] text-[#a3a3a3]">{transcript}</p>
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div className="surface overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <h2 className="text-[13px] font-medium text-[#a3a3a3]">Recent Voice Sessions</h2>
          </div>
          <div className="divide-y divide-[#0f0f0f]">
            {mockTranscripts.map((session) => (
              <div key={session.id} className="px-4 py-3.5 hover:bg-[#0f0f0f] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#fafafa] mb-1 truncate">
                      &quot;{session.question}&quot;
                    </p>
                    <p className="text-[12px] text-[#525252] line-clamp-2 leading-relaxed">
                      {session.answer}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#404040]" strokeWidth={2} />
                        <span className="text-[10px] text-[#404040]">{session.duration}</span>
                      </div>
                      <span className="text-[10px] text-[#404040]">{session.time}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Volume2 className="w-3.5 h-3.5 text-[#404040]" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
