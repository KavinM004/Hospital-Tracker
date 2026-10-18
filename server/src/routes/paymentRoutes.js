import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import Admission from "../models/Admission.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

router.post("/create-order", requireAuth, async (req, res, next) => {
  try {
    const { admissionId } = req.body;
    const admission = await Admission.findOne({ _id: admissionId, patient: req.user._id });
    if (!admission) return res.status(404).json({ message: "Admission not found." });
    if (admission.paymentStatus === "PAID") return res.status(409).json({ message: "This admission is already paid." });
    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ message: "Payments are not configured. Add Razorpay test keys to the server .env file." });
    const order = await razorpay.orders.create({
      amount: Math.round(admission.fee * 100), currency: "INR",
      receipt: `adm_${admission._id.toString().slice(-12)}`,
      notes: { admissionId: admission._id.toString(), patientId: req.user._id.toString() }
    });
    admission.paymentOrderId = order.id;
    await admission.save();
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, admissionId: admission._id });
  } catch (err) { next(err); }
});

router.post("/verify", requireAuth, async (req, res, next) => {
  try {
    const { admissionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const admission = await Admission.findOne({ _id: admissionId, patient: req.user._id });
    if (!admission) return res.status(404).json({ message: "Admission not found." });
    if (!admission.paymentOrderId || admission.paymentOrderId !== razorpay_order_id) return res.status(400).json({ message: "Payment order does not match." });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(razorpay_signature || "");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ message: "Payment signature verification failed." });
    admission.paymentStatus = "PAID";
    admission.paymentId = razorpay_payment_id;
    await admission.save();
    res.json({ message: "Payment verified.", admission });
  } catch (err) { next(err); }
});
export default router;
