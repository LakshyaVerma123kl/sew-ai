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
      style={{
        position: "relative",
        overflow: "hidden",
        width,
        height,
        display: "block",
      }}
    >
      <img
        src={imageSrc}
        alt="Analyzed garment"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          objectFit: "cover",
        }}
      />
      {detections.map((det, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${det.box.xmin}%`,
            top: `${det.box.ymin}%`,
            width: `${det.box.xmax - det.box.xmin}%`,
            height: `${det.box.ymax - det.box.ymin}%`,
            border: "2px solid var(--brand)",
            background: "rgba(200,133,58,0.12)",
            borderRadius: "4px",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "-22px",
              left: 0,
              background: "var(--brand)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              fontFamily: "var(--font-body)",
            }}
          >
            {det.label} {Math.round(det.confidence * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
