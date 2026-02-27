import React from "react";
import { cn } from "@/lib/utils";
import BoundingBoxOverlay, { Detection } from "./BoundingBoxOverlay";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: Detection[];
}

export default function ChatMessage({
  role,
  content,
  imageSrc,
  detections,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] flex flex-col gap-3 px-4 py-3 rounded-2xl text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm",
        )}
      >
        {/* Render Image or Bounding Boxes if they exist */}
        {imageSrc && (
          <div className="w-full max-w-sm rounded-lg overflow-hidden border border-white/20">
            {detections && detections.length > 0 ? (
              // AI Response with visual markers
              <BoundingBoxOverlay
                imageSrc={imageSrc}
                detections={detections}
                width="100%"
                height="auto"
              />
            ) : (
              // User's original uploaded image
              <img
                src={imageSrc}
                alt="Uploaded dress"
                className="w-full h-auto object-cover"
              />
            )}
          </div>
        )}

        {/* Render the text/transcription */}
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
