import { useEffect, useRef } from "react";
import type { TranscriptEntry } from "../types/messages";

interface TranscriptProps {
  entries: TranscriptEntry[];
}

export function Transcript({ entries }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>No messages yet. Connect to start a conversation.</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {entries.map((entry, index) => (
        <div key={index} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              entry.role === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
            }`}
          >
            <p className="text-lg whitespace-pre-wrap">{entry.content}</p>
            <span className="text-xs opacity-60 mt-1 block">{new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
