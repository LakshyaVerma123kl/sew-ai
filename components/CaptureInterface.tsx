"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";

// Import the modular UI components we created
import CameraFeed from "./ui/CameraFeed";
import AudioRecorder from "./ui/AudioRecorder";

export default function CaptureInterface() {
  // Centralized State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- SUBMIT LOGIC ---
  const handleAnalyze = async () => {
    if (!imageSrc) return alert("Please capture or upload an image first.");

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append("image", imageSrc);

    if (audioBlob) {
      const audioFile = new File([audioBlob], "recording.webm", {
        type: "audio/webm",
      });
      formData.append("audio", audioFile);
    }

    try {
      console.log("Sending to AI...");

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log("Transcription:", data.transcription);
        console.log("AI Analysis:", data.analysis);
        alert("Success! Check the console for the AI's tailoring advice.");

        // TODO: In the next step, we will route to a new /chat page here
        // passing the data.analysis and image so the user can see the bounding boxes!
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
      alert("An error occurred while analyzing the dress.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6 w-full max-w-md mx-auto">
      {/* Visual Input Section (Modular Component) */}
      <div className="w-full shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <CameraFeed imageSrc={imageSrc} setImageSrc={setImageSrc} />
      </div>

      {/* Controls Section */}
      <div className="w-full flex flex-col gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
        {/* Audio Input Section (Modular Component) */}
        <AudioRecorder audioBlob={audioBlob} setAudioBlob={setAudioBlob} />

        {/* Submit Button */}
        <button
          onClick={handleAnalyze}
          disabled={!imageSrc || isAnalyzing}
          className="mt-2 flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Send size={20} />
              Analyze Dress
            </>
          )}
        </button>
      </div>
    </div>
  );
}
