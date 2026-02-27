"use client";

import React, { useState, useRef, useEffect } from "react";
import { Scissors } from "lucide-react";
import ChatMessage from "@/components/ui/ChatMessage";
import ChatInput from "@/components/ui/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Detection } from "@/components/ui/BoundingBoxOverlay";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: Detection[];
  previewImageUrl?: string | null;
};

const WELCOME: Message = {
  id: "welcome-1",
  role: "ai",
  content: `Welcome to **Tailor AI** — your personal sewing assistant.\n\nHere's how to get started:\n- 📷 **Photo** — snap or upload a picture of the garment\n- 🎙️ **Voice** — record a quick note explaining what's wrong\n- 🎥 **Live** — use continuous camera + voice for real-time guidance\n\nI'll diagnose the issue, give you step-by-step repair instructions, and show you a preview of the fix!`,
};

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAnalyzing]);

  const addAIMessage = (msg: Omit<Message, "id" | "role">) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "ai", ...msg },
    ]);
  };

  const handleSendMessage = async (
    imageSrc: string | null,
    audioBlob: Blob | null,
    text: string,
  ) => {
    const userContent =
      text && text !== "[Live Mode]"
        ? text
        : imageSrc
          ? audioBlob
            ? "🎙️ Voice note + image"
            : "Please analyze this garment."
          : text;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        content: userContent,
        imageSrc,
      },
    ]);

    // Text-only chat
    if (!imageSrc) {
      if (!text.trim()) return;
      setIsAnalyzing(true);
      try {
        const history = messages
          .filter((m) => !m.imageSrc)
          .map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          }));
        history.push({ role: "user", content: text });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });
        const data = await res.json();
        if (data.success) addAIMessage({ content: data.message });
        else throw new Error(data.error);
      } catch {
        addAIMessage({
          content: "Sorry, something went wrong. Please try again.",
        });
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("image", imageSrc);
    if (audioBlob)
      formData.append(
        "audio",
        new File([audioBlob], "recording.webm", { type: "audio/webm" }),
      );
    if (text && text !== "[Live Mode]") formData.append("text", text);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Fetch preview image
      let previewImageUrl: string | null = null;
      try {
        const previewRes = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalImage: imageSrc,
            prompt: data.visionAnalysis,
            maskCoordinates: data.detections || [],
          }),
        });
        const pd = await previewRes.json();
        if (pd.success && pd.previewUrl) previewImageUrl = pd.previewUrl;
      } catch {
        /* preview failed silently */
      }

      addAIMessage({
        content: data.analysis,
        imageSrc,
        detections: data.detections || [],
        previewImageUrl,
      });
    } catch (err) {
      console.error(err);
      addAIMessage({
        content: "Sorry, I had trouble analyzing that. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxHeight: "100dvh",
        background: "var(--bg-base)",
        overflow: "hidden",
        transition: "background 0.3s",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1.25rem",
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          zIndex: 10,
          boxShadow: "var(--shadow-sm)",
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {/* Logo mark */}
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(200,133,58,0.3)",
            }}
          >
            <Scissors size={18} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
              }}
            >
              Tailor AI
            </h1>
            <p
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Smart Sewing Assistant
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Constrained inner column */}
        <div
          style={{
            maxWidth: "720px",
            width: "100%",
            margin: "0 auto",
            flex: 1,
          }}
        >
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              imageSrc={msg.imageSrc}
              detections={msg.detections}
              previewImageUrl={msg.previewImageUrl}
            />
          ))}

          {/* Typing indicator */}
          {isAnalyzing && (
            <div
              className="animate-fade-in"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
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
                  boxShadow: "0 2px 8px rgba(200,133,58,0.35)",
                }}
              >
                <Scissors size={14} color="#fff" strokeWidth={2} />
              </div>
              <div
                style={{
                  padding: "0.875rem 1rem",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px 20px 20px 20px",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  className="dot-bounce"
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--brand)",
                    display: "inline-block",
                  }}
                />
                <span
                  className="dot-bounce"
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--brand)",
                    display: "inline-block",
                  }}
                />
                <span
                  className="dot-bounce"
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--brand)",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    marginLeft: "6px",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Analyzing your garment…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div
        style={{
          maxWidth: "720px",
          width: "100%",
          margin: "0 auto",
          alignSelf: "stretch",
        }}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
}
