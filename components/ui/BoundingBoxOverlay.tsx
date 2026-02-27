import React from "react";

export interface Detection {
  label: string;
  confidence: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

interface Props {
  imageSrc: string;
  detections: Detection[];
  width?: number | string;
  height?: number | string;
}

export default function BoundingBoxOverlay({
  imageSrc,
  detections,
  width = "100%",
  height = "auto",
}: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm"
      style={{ width, height }}
    >
      <img
        src={imageSrc}
        alt="Analyzed"
        className="w-full h-full object-cover"
      />

      {detections.map((det, i) => {
        const left = det.box.xmin;
        const top = det.box.ymin;
        const boxWidth = det.box.xmax - det.box.xmin;
        const boxHeight = det.box.ymax - det.box.ymin;

        return (
          <div
            key={i}
            className="absolute border-2 border-green-500 bg-green-500/20"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${boxWidth}%`,
              height: `${boxHeight}%`,
            }}
          >
            <span className="absolute -top-6 left-0 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              {det.label} {Math.round(det.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
