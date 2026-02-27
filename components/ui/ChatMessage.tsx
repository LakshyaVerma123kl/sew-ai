import React from "react";
import BoundingBoxOverlay, { Detection } from "./BoundingBoxOverlay";
import { Scissors } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: Detection[];
  previewImageUrl?: string | null;
}

/* ── Lightweight markdown renderer ── */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];

    if (raw.startsWith("### ")) {
      out.push(<h3 key={i}>{inlineFormat(raw.slice(4))}</h3>);
    } else if (raw.startsWith("## ")) {
      out.push(<h2 key={i}>{inlineFormat(raw.slice(3))}</h2>);
    } else if (raw.startsWith("# ")) {
      out.push(<h1 key={i}>{inlineFormat(raw.slice(2))}</h1>);
    } else if (raw.startsWith("---") || raw.startsWith("***")) {
      out.push(<hr key={i} />);
    } else if (raw.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      out.push(
        <pre key={i}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
    } else if (/^[-*]\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={i}>
          {items.map((it, j) => (
            <li key={j}>{inlineFormat(it)}</li>
          ))}
        </ul>,
      );
      continue;
    } else if (/^\d+\.\s/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      out.push(
        <ol key={i}>
          {items.map((it, j) => (
            <li key={j}>{inlineFormat(it)}</li>
          ))}
        </ol>,
      );
      continue;
    } else if (raw.trim() !== "") {
      out.push(<p key={i}>{inlineFormat(raw)}</p>);
    }
    i++;
  }
  return out;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (/^\*\*.*\*\*$/.test(part))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^`.*`$/.test(part)) return <code key={i}>{part.slice(1, -1)}</code>;
    if (/^\*.*\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^__.*__$/.test(part))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
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
      className="animate-fade-slide-up"
      style={{
        display: "flex",
        width: "100%",
        marginBottom: "1.25rem",
        justifyContent: isUser ? "flex-end" : "flex-start",
        gap: "0.5rem",
        alignItems: "flex-start",
      }}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
            boxShadow: "0 2px 8px rgba(200,133,58,0.35)",
          }}
        >
          <Scissors size={14} color="#fff" strokeWidth={2} />
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: "min(80%, 580px)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          borderRadius: isUser ? "20px 20px 4px 20px" : "4px 20px 20px 20px",
          padding: "0.875rem 1rem",
          fontSize: "0.875rem",
          lineHeight: 1.65,
          boxShadow: "var(--shadow-sm)",
          background: isUser
            ? "linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)"
            : "var(--bg-card)",
          color: isUser ? "#fff" : "var(--text-primary)",
          border: isUser ? "none" : "1px solid var(--border)",
          wordBreak: "break-word",
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        {/* Image */}
        {imageSrc && (
          <div
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              border: isUser
                ? "1px solid rgba(255,255,255,0.2)"
                : "1px solid var(--border)",
            }}
          >
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
                alt="Uploaded garment"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                }}
              />
            )}
          </div>
        )}

        {/* Preview after fix */}
        {previewImageUrl && (
          <div>
            <p
              style={{
                fontSize: "0.68rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 700,
                color: "var(--brand)",
                marginBottom: "0.4rem",
              }}
            >
              ✦ AI Preview — After Fix
            </p>
            <img
              src={previewImageUrl}
              alt="AI fixed preview"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "10px",
                border: "1px solid var(--brand-light)",
                display: "block",
              }}
            />
          </div>
        )}

        {/* Text */}
        {isUser ? (
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{content}</p>
        ) : (
          <div className="tailor-prose">{renderMarkdown(content)}</div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: "2px",
            fontSize: "0.6rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          YOU
        </div>
      )}
    </div>
  );
}
