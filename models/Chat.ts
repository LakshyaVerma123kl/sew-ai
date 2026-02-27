import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  userId?: mongoose.Types.ObjectId;
  originalImage: string; // URL or Base64
  previewImage?: string; // URL of the "fixed" image
  audioTranscription: string;
  aiAnalysis: string;
  detections: Array<{
    label: string;
    confidence: number;
    box: { xmin: number; ymin: number; xmax: number; ymax: number };
  }>;
  messages: Array<{
    role: "user" | "ai";
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
}

const ChatSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  originalImage: { type: String, required: true },
  previewImage: { type: String },
  audioTranscription: { type: String },
  aiAnalysis: { type: String },
  detections: { type: Array, default: [] },
  messages: [
    {
      role: { type: String, enum: ["user", "ai"], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Chat ||
  mongoose.model<IChat>("Chat", ChatSchema);
