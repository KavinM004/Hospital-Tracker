import { Router } from "express";
import Doctor from "../models/Doctor.js";
const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const doctors = await Doctor.find({ active: true }).sort({ specialty: 1, name: 1 }).select("name specialty qualification fee availableDays");
    res.json({ doctors });
  } catch (err) { next(err); }
});
export default router;
