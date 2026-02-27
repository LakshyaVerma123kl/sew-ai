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
  Image,
} from "lucide-react";

interface ChatInputProps {
  onSendMessage: (
    imageSrc: string | null,
    audioBlob: Blob | null,
    text: string,
  ) => void;
  isAnalyzing: boolean;
}

const BTN = {
  base: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid var(--border)",
    background: "var(--bg-input)",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.18s ease",
  } as React.CSSProperties,
};

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
  const [recordSeconds, setRecordSeconds] = useState(0);

  const webcamRef = useRef<Webcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const liveAudioRef = useRef<MediaRecorder | null>(null);
  const liveAudioStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [text]);

  const capture = useCallback(() => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) {
      setImageSrc(screenshot);
      setShowCamera(false);
    }
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Voice recording
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
        setRecordSeconds(0);
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(
        () => setRecordSeconds((s) => s + 1),
        1000,
      );
    } catch (err) {
      console.error("Mic failed", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Live mode
  const startLiveMode = async () => {
    setLiveMode(true);
    setShowCamera(true);
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      liveAudioStreamRef.current = audioStream;
      const startMr = () => {
        const mr = new MediaRecorder(audioStream);
        liveAudioRef.current = mr;
        const chunks: BlobPart[] = [];
        mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
        mr.onstop = async () => {
          const frame = webcamRef.current?.getScreenshot();
          if (frame) {
            const blob = new Blob(chunks, { type: "audio/webm" });
            onSendMessage(frame, blob, "[Live Mode]");
          }
        };
        mr.start();
      };
      startMr();
      liveIntervalRef.current = setInterval(() => {
        liveAudioRef.current?.stop();
        setTimeout(startMr, 200);
      }, 5000);
    } catch (err) {
      console.error("Live mode failed", err);
      stopLiveMode();
    }
  };

  const stopLiveMode = () => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    liveAudioRef.current?.stop();
    liveAudioStreamRef.current?.getTracks().forEach((t) => t.stop());
    setLiveMode(false);
    setShowCamera(false);
  };

  useEffect(
    () => () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const handleSend = () => {
    if (isAnalyzing) return;
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

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const canSend = (!!imageSrc || !!text.trim()) && !isAnalyzing;

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "20px",
              overflow: "hidden",
              width: "100%",
              maxWidth: "400px",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.875rem 1rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {liveMode ? "🔴 Live Mode" : "Take a Photo"}
              </span>
              <button
                onClick={() => {
                  if (liveMode) stopLiveMode();
                  else setShowCamera(false);
                }}
                style={{
                  ...BTN.base,
                  width: "32px",
                  height: "32px",
                  border: "none",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Webcam */}
            <div style={{ position: "relative", background: "#000" }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: { ideal: "environment" } }}
                style={{
                  width: "100%",
                  display: "block",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                }}
              />
              {liveMode && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "rgba(200,0,0,0.85)",
                    color: "#fff",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "99px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#ff6b6b",
                      display: "inline-block",
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  />
                  LIVE
                </div>
              )}
            </div>

            {!liveMode && (
              <div
                style={{ padding: "0.875rem", display: "flex", gap: "0.5rem" }}
              >
                <button
                  onClick={capture}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "var(--brand)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "opacity 0.2s",
                  }}
                >
                  <Camera size={16} /> Capture
                </button>
              </div>
            )}

            {liveMode && (
              <p
                style={{
                  textAlign: "center",
                  padding: "0.75rem",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                Auto-sending every 5 seconds
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main input container */}
      <div
        style={{
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
          padding: "0.75rem 1rem",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          transition: "background 0.3s, border-color 0.3s",
        }}
      >
        {/* Image preview */}
        {imageSrc && (
          <div style={{ marginBottom: "0.625rem" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={imageSrc}
                alt="Preview"
                style={{
                  height: "72px",
                  width: "72px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  display: "block",
                }}
              />
              <button
                onClick={() => setImageSrc(null)}
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "var(--error)",
                  color: "#fff",
                  border: "2px solid var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Audio indicator */}
        {(audioBlob || isRecording) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.625rem",
              padding: "0.4rem 0.75rem",
              background: isRecording ? "var(--error-bg)" : "var(--success-bg)",
              borderRadius: "99px",
              width: "fit-content",
              border: `1px solid ${isRecording ? "var(--error)" : "var(--success)"}`,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isRecording ? "var(--error)" : "var(--success)",
                display: "inline-block",
                animation: isRecording
                  ? "pulse 0.8s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: isRecording ? "var(--error)" : "var(--success)",
              }}
            >
              {isRecording
                ? `Recording ${fmtTime(recordSeconds)}`
                : "Voice note ready"}
            </span>
            {!isRecording && audioBlob && (
              <button
                onClick={() => setAudioBlob(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--error)",
                  display: "flex",
                  padding: "0 2px",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Input row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
            {/* Camera */}
            <IconBtn
              onClick={() => {
                setShowCamera(true);
              }}
              title="Take photo"
              active={showCamera && !liveMode}
            >
              <Camera size={17} />
            </IconBtn>

            {/* Upload */}
            <IconBtn
              onClick={() => fileInputRef.current?.click()}
              title="Upload image"
            >
              <Image size={17} />
            </IconBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleUpload}
            />

            {/* Live mode */}
            <IconBtn
              onClick={liveMode ? stopLiveMode : startLiveMode}
              title={liveMode ? "Stop live mode" : "Live mode"}
              active={liveMode}
              danger={liveMode}
            >
              {liveMode ? <VideoOff size={17} /> : <Video size={17} />}
            </IconBtn>

            {/* Mic */}
            <IconBtn
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop recording" : "Record voice note"}
              active={isRecording}
              danger={isRecording}
            >
              {isRecording ? <Square size={17} /> : <Mic size={17} />}
            </IconBtn>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the issue or ask anything…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              minHeight: "40px",
              maxHeight: "120px",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              padding: "0.6rem 0.875rem",
              fontSize: "0.875rem",
              fontFamily: "var(--font-body)",
              lineHeight: 1.5,
              outline: "none",
              transition: "border-color 0.2s, background 0.3s",
              overflowY: "auto",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--brand)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              flexShrink: 0,
              background: canSend ? "var(--brand)" : "var(--bg-input)",
              border: `1px solid ${canSend ? "var(--brand)" : "var(--border)"}`,
              color: canSend ? "#fff" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: canSend ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              boxShadow: canSend ? "0 2px 8px rgba(200,133,58,0.35)" : "none",
            }}
          >
            {isAnalyzing ? (
              <Loader2
                size={17}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>

        {liveMode && (
          <p
            style={{
              textAlign: "center",
              fontSize: "0.7rem",
              color: "var(--brand)",
              marginTop: "0.5rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            🔴 LIVE — sending every 5 seconds
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

/* ── Small icon button helper ── */
function IconBtn({
  children,
  onClick,
  title,
  active = false,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        flexShrink: 0,
        border: `1px solid ${
          active
            ? danger
              ? "var(--error)"
              : "var(--brand)"
            : hovered
              ? "var(--brand)"
              : "var(--border)"
        }`,
        background: active
          ? danger
            ? "var(--error-bg)"
            : "var(--brand-subtle)"
          : hovered
            ? "var(--brand-subtle)"
            : "var(--bg-input)",
        color: active
          ? danger
            ? "var(--error)"
            : "var(--brand)"
          : hovered
            ? "var(--brand)"
            : "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.18s ease",
        animation:
          active && danger ? "pulse-ring 1.5s ease-out infinite" : "none",
      }}
    >
      {children}
    </button>
  );
}
