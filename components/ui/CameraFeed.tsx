"use client";
import React, { useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, Upload, Trash2 } from "lucide-react";

interface CameraFeedProps {
  imageSrc: string | null;
  setImageSrc: (src: string | null) => void;
}

export default function CameraFeed({ imageSrc, setImageSrc }: CameraFeedProps) {
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      setImageSrc(webcamRef.current.getScreenshot());
    }
  }, [webcamRef, setImageSrc]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (imageSrc) {
    return (
      <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden group">
        <img
          src={imageSrc}
          alt="Captured"
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => setImageSrc(null)}
          className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[3/4] bg-gray-900 rounded-xl overflow-hidden flex flex-col items-center justify-center text-white">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: "environment" }}
        className="absolute inset-0 object-cover w-full h-full opacity-50"
      />
      <div className="z-10 flex gap-4">
        <button
          onClick={capture}
          className="p-4 bg-blue-600 rounded-full hover:bg-blue-700"
        >
          <Camera size={24} />
        </button>
        <label className="p-4 bg-gray-700 rounded-full hover:bg-gray-600 cursor-pointer">
          <Upload size={24} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>
    </div>
  );
}
