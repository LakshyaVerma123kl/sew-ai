import React from "react";

export interface Detection {
  label: string;
  confidence: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

interface Props {
  imageSrc: string;
  detections: Detection[];
  width: number; // Rendered width of the container
  height: number; // Rendered height of the container
}

export default function BoundingBoxOverlay({
  imageSrc,
  detections,
  width,
  height,
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
        // Assuming your Python backend returns coordinates relative to the original image dimensions.
        // You will need to calculate percentages to overlay them correctly.
        const left = (det.box.xmin / width) * 100;
        const top = (det.box.ymin / height) * 100;
        const boxWidth = ((det.box.xmax - det.box.xmin) / width) * 100;
        const boxHeight = ((det.box.ymax - det.box.ymin) / height) * 100;

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
              {det.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
