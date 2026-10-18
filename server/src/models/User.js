import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, maxlength: 20 },
  passwordHash: { type: String, select: false },
  googleId: { type: String, sparse: true },
  role: { type: String, enum: ["PATIENT", "ADMIN"], default: "PATIENT" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
