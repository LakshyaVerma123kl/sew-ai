import React from "react";
import { cn } from "@/lib/utils";
import BoundingBoxOverlay, { Detection } from "./BoundingBoxOverlay";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: Detection[];
  previewImageUrl?: string | null;
}

// Simple markdown renderer (bold, italic, headers, code, lists)
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="font-bold text-base mt-3 mb-1">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="font-bold text-lg mt-4 mb-1">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="font-bold text-xl mt-4 mb-2">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          {formatInline(line.slice(2))}
        </li>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="ml-4 list-decimal">
          {formatInline(line.replace(/^\d+\.\s/, ""))}
        </li>,
      );
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={i}
          className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono"
        >
          {codeLines.join("\n")}
        </pre>,
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="leading-relaxed">
          {formatInline(line)}
        </p>,
      );
    }
    i++;
  }
  return elements;
}

function formatInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function ChatMessage({
  role,
  content,
  imageSrc,
  detections,
  previewImageUrl,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          AI
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] flex flex-col gap-3 px-4 py-3 rounded-2xl text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-700 shadow-sm",
        )}
      >
        {/* User image or AI overlay */}
        {imageSrc && (
          <div className="w-full max-w-sm rounded-lg overflow-hidden border border-white/20">
            {detections && detections.length > 0 ? (
              <BoundingBoxOverlay
                imageSrc={imageSrc}
                detections={detections}
                width="100%"
                height="auto"
              />
            ) : (
              <img
                src={imageSrc}
                alt="Uploaded dress"
                className="w-full h-auto object-cover"
              />
            )}
          </div>
        )}

        {/* AI-generated "after fix" preview */}
        {previewImageUrl && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold uppercase tracking-wide">
              ✨ AI Preview — After Fix
            </p>
            <img
              src={previewImageUrl}
              alt="AI fixed preview"
              className="w-full h-auto rounded-lg border border-blue-200 dark:border-blue-700 shadow"
            />
          </div>
        )}

        {/* Markdown content */}
        <div className={cn("leading-relaxed", isUser ? "text-white" : "")}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold ml-2 flex-shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  );
}
