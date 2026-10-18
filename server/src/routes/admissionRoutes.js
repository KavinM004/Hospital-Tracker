import { Router } from "express";
import mongoose from "mongoose";
import Admission from "../models/Admission.js";
import Doctor from "../models/Doctor.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();

function localDateKey(date = new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

router.post("/", requireAuth, async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const { doctorId, patientName, patientAge, gender, phone, reason, appointmentDate } = req.body;
    if (!doctorId || !patientName?.trim() || patientAge === "" || !gender || !phone?.trim() || !reason?.trim() || !appointmentDate) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }
    if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: "Please select a valid doctor." });
    const age = Number(patientAge);
    if (!Number.isInteger(age) || age < 0 || age > 120) return res.status(400).json({ message: "Enter a valid patient age." });
    const doctor = await Doctor.findOne({ _id: doctorId, active: true });
    if (!doctor) return res.status(404).json({ message: "Selected doctor is unavailable." });
    const appointment = new Date(appointmentDate);
    if (Number.isNaN(appointment.getTime()) || appointment < new Date(new Date().setHours(0,0,0,0))) {
      return res.status(400).json({ message: "Choose a valid current or future appointment date." });
    }
    const todayKey = localDateKey();
    let admission;
    await session.withTransaction(async () => {
      const last = await Admission.findOne({ tokenDate: todayKey }).sort({ tokenNumber: -1 }).session(session);
      admission = new Admission({
        patient: req.user._id, doctor: doctor._id, patientName: patientName.trim(), patientAge: age, gender,
        phone: phone.trim(), reason: reason.trim(), appointmentDate: appointment, tokenDate: todayKey,
        tokenNumber: (last?.tokenNumber || 0) + 1, fee: doctor.fee, paymentStatus: process.env.RAZORPAY_KEY_ID ? "PENDING" : "PENDING"
      });
      await admission.save({ session });
    });
    await admission.populate("doctor", "name specialty qualification fee");
    res.status(201).json({ admission });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Token allocation conflict. Please submit again." });
    next(err);
  } finally { await session.endSession(); }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const admissions = await Admission.find({ patient: req.user._id }).populate("doctor", "name specialty").sort({ createdAt: -1 }).limit(50);
    res.json({ admissions });
  } catch (err) { next(err); }
});

router.get("/:id/token.pdf", requireAuth, async (req, res, next) => {
  try {
    const admission = await Admission.findOne({ _id: req.params.id, patient: req.user._id }).populate("doctor", "name specialty qualification");
    if (!admission) return res.status(404).json({ message: "Token not found." });
    const PDFDocument = (await import("pdfkit")).default;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=medicare-token-${admission.tokenDate}-${admission.tokenNumber}.pdf`);
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);
    doc.fillColor("#0B2D55").fontSize(25).font("Helvetica-Bold").text("MEDICARE", { align: "center" });
    doc.fillColor("#0C9F91").fontSize(11).font("Helvetica").text("H O S P I T A L", { align: "center" });
    doc.moveDown(1.2).strokeColor("#12B8A6").lineWidth(2).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(1.2).fillColor("#0B2D55").font("Helvetica-Bold").fontSize(19).text("PATIENT TOKEN SHEET", { align: "center" });
    doc.moveDown(0.8).roundedRect(48, doc.y, 499, 80, 10).fill("#EEF8FC");
    const boxY = doc.y;
    doc.fillColor("#0B2D55").fontSize(11).font("Helvetica").text("TOKEN NUMBER", 64, boxY + 15);
    doc.font("Helvetica-Bold").fontSize(30).fillColor("#087E8B").text(String(admission.tokenNumber).padStart(3, "0"), 64, boxY + 31);
    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(`Date: ${admission.tokenDate}`, 350, boxY + 22);
    doc.text(`Payment: ${admission.paymentStatus}`, 350, boxY + 42);
    doc.y = boxY + 105;
    const rows = [
      ["Patient name", admission.patientName],
      ["Age / Gender", `${admission.patientAge} / ${admission.gender}`],
      ["Contact number", admission.phone],
      ["Doctor", admission.doctor?.name || "—"],
      ["Specialty", admission.doctor?.specialty || "—"],
      ["Appointment date", new Date(admission.appointmentDate).toLocaleDateString("en-IN")],
      ["Consultation fee", `INR ${admission.fee.toFixed(2)}`],
      ["Reason for visit", admission.reason]
    ];
    for (const [label, value] of rows) {
      const y = doc.y;
      doc.fillColor("#64748B").font("Helvetica").fontSize(10).text(label.toUpperCase(), 55, y, { width: 150 });
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11).text(String(value), 210, y, { width: 325 });
      doc.moveDown(0.6);
      doc.strokeColor("#E2E8F0").lineWidth(0.6).moveTo(55, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.6);
    }
    doc.moveDown(1).fillColor("#475569").font("Helvetica").fontSize(9).text("Please arrive 15 minutes before your appointment and carry this token sheet.", { align: "center" });
    doc.text("This token confirms registration; payment is confirmed only when status is PAID.", { align: "center" });
    doc.end();
  } catch (err) { next(err); }
});
export default router;
