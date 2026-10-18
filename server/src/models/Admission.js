import mongoose from "mongoose";

const admissionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientName: { type: String, required: true, trim: true },
  patientAge: { type: Number, required: true, min: 0, max: 120 },
  gender: { type: String, enum: ["Female", "Male", "Other", "Prefer not to say"], required: true },
  phone: { type: String, required: true, trim: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  appointmentDate: { type: Date, required: true },
  tokenNumber: { type: Number, required: true },
  tokenDate: { type: String, required: true },
  fee: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
  paymentOrderId: { type: String },
  paymentId: { type: String }
}, { timestamps: true });

admissionSchema.index({ tokenDate: 1, tokenNumber: 1 }, { unique: true });
export default mongoose.model("Admission", admissionSchema);
