"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
  Mic,
  Square,
  Camera,
  Upload,
  Send,
  Loader2,
  X,
  Video,
  VideoOff,
} from "lucide-react";

interface ChatInputProps {
  onSendMessage: (
    imageSrc: string | null,
    audioBlob: Blob | null,
    text: string,
  ) => void;
  isAnalyzing: boolean;
}

export default function ChatInput({
  onSendMessage,
  isAnalyzing,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [liveSpeaking, setLiveSpeaking] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveMediaRecorderRef = useRef<MediaRecorder | null>(null);

  // --- CAPTURE IMAGE ---
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const screenshot = webcamRef.current.getScreenshot();
      setImageSrc(screenshot);
      setShowCamera(false);
    }
  }, []);

  // --- FILE UPLOAD ---
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- AUDIO RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access failed", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // --- LIVE MODE: capture frame + record audio every N seconds ---
  const startLiveMode = async () => {
    setLiveMode(true);
    setShowCamera(true);
    setLiveSpeaking(true);

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mr = new MediaRecorder(audioStream);
      liveMediaRecorderRef.current = mr;

      liveIntervalRef.current = setInterval(async () => {
        // Capture frame
        const frame = webcamRef.current?.getScreenshot();
        if (!frame) return;

        // Collect last ~3s of audio
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mr.stop();
        mr.onstop = async () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          audioStream.getTracks().forEach((t) => t.stop());
          // Send live frame + audio
          onSendMessage(frame, blob, "[Live Mode]");
          // Restart recording
          try {
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            });
            const newMr = new MediaRecorder(newStream);
            liveMediaRecorderRef.current = newMr;
            newMr.start();
          } catch (_) {}
        };
      }, 5000);

      mr.start();
    } catch (err) {
      console.error("Live mode failed", err);
      setLiveMode(false);
      setLiveSpeaking(false);
    }
  };

  const stopLiveMode = () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    liveMediaRecorderRef.current?.stop();
    setLiveMode(false);
    setLiveSpeaking(false);
    setShowCamera(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    };
  }, []);

  // --- SEND ---
  const handleSend = () => {
    if (!imageSrc && !text.trim()) return;
    onSendMessage(imageSrc, audioBlob, text);
    setText("");
    setImageSrc(null);
    setAudioBlob(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (imageSrc || text.trim()) && !isAnalyzing;

  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <span className="text-white font-semibold text-sm">
                {liveMode
                  ? "🔴 Live Mode — Auto capturing every 5s"
                  : "Take a Photo"}
              </span>
              <button
                onClick={() => {
                  if (liveMode) stopLiveMode();
                  else setShowCamera(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="w-full aspect-[4/3] object-cover"
            />
            {!liveMode && (
              <div className="p-3 flex gap-2">
                <button
                  onClick={capture}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                >
                  <Camera size={18} /> Capture
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image preview */}
      {imageSrc && (
        <div className="relative inline-block mb-3">
          <img
            src={imageSrc}
            alt="Preview"
            className="h-20 w-20 object-cover rounded-xl border border-gray-300 dark:border-gray-600"
          />
          <button
            onClick={() => setImageSrc(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Audio indicator */}
      {audioBlob && (
        <div className="flex items-center gap-2 mb-2 text-xs text-green-600 dark:text-green-400">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Voice note ready
          <button
            onClick={() => setAudioBlob(null)}
            className="text-red-500 ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        {/* Camera button */}
        <button
          onClick={() => {
            setShowCamera(true);
            setLiveMode(false);
          }}
          className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex-shrink-0"
          title="Take photo"
        >
          <Camera size={20} />
        </button>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex-shrink-0"
          title="Upload image"
        >
          <Upload size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />

        {/* Live Mode button */}
        <button
          onClick={liveMode ? stopLiveMode : startLiveMode}
          className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
            liveMode
              ? "bg-red-500 text-white animate-pulse"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-600"
          }`}
          title={
            liveMode ? "Stop live mode" : "Live mode (auto capture + voice)"
          }
        >
          {liveMode ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* Mic button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-3 rounded-xl flex-shrink-0 transition-colors ${
            isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-600"
          }`}
          title={isRecording ? "Stop recording" : "Record voice note"}
        >
          {isRecording ? <Square size={20} /> : <Mic size={20} />}
        </button>

        {/* Text input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the issue or ask a question…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          style={{ minHeight: "48px", maxHeight: "120px" }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          {isAnalyzing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </div>

      {liveMode && (
        <p className="text-xs text-center text-purple-500 mt-2 animate-pulse">
          🔴 Live Mode active — capturing every 5 seconds
        </p>
      )}
    </div>
  );
}
