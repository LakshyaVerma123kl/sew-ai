import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

// The 'mongoose.models' check prevents Next.js from recompiling the model on every hot reload
export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
