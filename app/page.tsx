"use client";

import React, { useState, useRef, useEffect } from "react";
import { Scissors } from "lucide-react";
import ChatMessage from "@/components/ui/ChatMessage";
import ChatInput from "@/components/ui/ChatInput";
import { ThemeToggle } from "@/components/ThemeToggle"; // Optional, if you added it

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  imageSrc?: string | null;
  detections?: any[];
};

export default function HomeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "ai",
      content:
        "Hi! I'm your Tailor AI. Need help fixing a garment? \n\nSnap a picture of the dress using the camera icon below, record a quick voice note explaining what's wrong, and I'll show you exactly how to fix it.",
    },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (
    imageSrc: string | null,
    audioBlob: Blob | null,
    text: string,
  ) => {
    // 1. Add user message to UI immediately
    const userMsgId = Date.now().toString();
    const userContent =
      text ||
      (audioBlob ? "[Voice Note Attached]" : "Please analyze this image.");

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: userContent,
        imageSrc: imageSrc,
      },
    ]);

    // If there's no image, we can just do standard text chat (you can route this to /api/chat later)
    if (!imageSrc) {
      alert("For the best results, please attach an image of the dress!");
      return;
    }

    setIsAnalyzing(true);

    // 2. Prepare Data for API
    const formData = new FormData();
    formData.append("image", imageSrc);
    if (audioBlob) {
      formData.append(
        "audio",
        new File([audioBlob], "recording.webm", { type: "audio/webm" }),
      );
    }

    try {
      // 3. Call the Multimodal AI Backend
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // 4. Add AI response to UI
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "ai",
            content: data.analysis,
            imageSrc: imageSrc, // Pass the image back so we can overlay boxes
            detections: data.detections || [], // Assuming Python API integrated in /api/analyze
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
          content: "Sorry, I had trouble analyzing that. Please try again.",
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Scissors className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tailor AI</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto scroll-smooth">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            imageSrc={msg.imageSrc}
            detections={msg.detections}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="w-full">
        <ChatInput
          onSendMessage={handleSendMessage}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
}
