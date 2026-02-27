"use client";
import React, { useState, useRef } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

interface AudioRecorderProps {
  audioBlob: Blob | null;
  setAudioBlob: (blob: Blob | null) => void;
}

export default function AudioRecorder({
  audioBlob,
  setAudioBlob,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) =>
        e.data.size > 0 && audioChunks.push(e.data);

      mediaRecorder.onstop = () => {
        setAudioBlob(new Blob(audioChunks, { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access failed", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (audioBlob) {
    return (
      <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-200 w-full">
        <span className="text-green-700 text-sm font-medium flex-1">
          Audio recorded successfully
        </span>
        <button
          onClick={() => setAudioBlob(null)}
          className="text-red-500 hover:bg-red-50 p-2 rounded"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors ${
        isRecording
          ? "bg-red-500 text-white animate-pulse"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {isRecording ? <Square size={18} /> : <Mic size={18} />}
      {isRecording ? "Stop Recording" : "Record Voice Note"}
    </button>
  );
}
