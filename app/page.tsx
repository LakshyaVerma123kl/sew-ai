"use client";

import React, { useState, useRef, useEffect } from "react";
import { Scissors } from "lucide-react";
import ChatMessage from "@/components/ui/ChatMessage";
import ChatInput from "@/components/ui/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: any[];
  previewImageUrl?: string | null;
};

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "ai",
      content:
        "Hi! I'm your **Tailor AI**. Need help fixing a garment?\n\nSnap a picture using the 📷 camera icon, record a 🎙️ voice note explaining what's wrong, and I'll diagnose the issue and show you exactly how to fix it — plus a preview of what it'll look like after!",
    },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (
    imageSrc: string | null,
    audioBlob: Blob | null,
    text: string,
  ) => {
    const userMsgId = Date.now().toString();
    const userContent =
      text && text !== "[Live Mode]"
        ? text
        : imageSrc
          ? audioBlob
            ? "🎙️ Voice note + image attached"
            : "Please analyze this image."
          : text;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: userContent,
        imageSrc: imageSrc,
      },
    ]);

    // Text-only chat (no image)
    if (!imageSrc) {
      if (!text.trim()) return;
      setIsAnalyzing(true);
      try {
        const chatMessages = messages
          .filter((m) => !m.imageSrc) // only text messages for chat context
          .map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content,
          }));
        chatMessages.push({ role: "user", content: text });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatMessages }),
        });
        const data = await response.json();
        if (data.success) {
          setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), role: "ai", content: data.message },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: "Sorry, I had trouble processing that. Please try again.",
          },
        ]);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("image", imageSrc);
    if (audioBlob) {
      formData.append(
        "audio",
        new File([audioBlob], "recording.webm", { type: "audio/webm" }),
      );
    }
    if (text && text !== "[Live Mode]") {
      formData.append("text", text);
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Get preview image
        let previewImageUrl: string | null = null;
        try {
          const previewRes = await fetch("/api/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              originalImage: imageSrc,
              prompt: data.analysis,
              maskCoordinates: data.detections || [],
            }),
          });
          const previewData = await previewRes.json();
          if (previewData.success && previewData.previewUrl) {
            previewImageUrl = previewData.previewUrl;
          }
        } catch (_) {
          // Preview generation failed silently
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: data.analysis,
            imageSrc: imageSrc,
            detections: data.detections || [],
            previewImageUrl,
          },
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content:
            "Sorry, I had trouble analyzing that. Please try again or rephrase your question.",
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Scissors className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Tailor AI</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Smart sewing assistant
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto scroll-smooth">
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

        {isAnalyzing && (
          <div className="flex justify-start mb-6">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
              AI
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5 items-center">
                <span
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="ml-2 text-xs text-gray-500">
                  Analyzing your garment…
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="w-full">
        <ChatInput
          onSendMessage={handleSendMessage}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
}
