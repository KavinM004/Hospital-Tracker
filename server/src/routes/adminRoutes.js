import { Router } from "express";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import Admission from "../models/Admission.js";
import adminMiddleware from "../middleware/admin.js";

const router = Router();

router.use(adminMiddleware);

const validStatuses = ["PENDING", "PAID", "FAILED"];

// Dashboard overview
router.get("/overview", async (_req, res, next) => {
  try {
    const [
      totalDoctors,
      activeDoctors,
      totalAdmissions,
      pendingPayments,
      paidPayments,
      failedPayments,
      revenueResult,
    ] = await Promise.all([
      Doctor.countDocuments(),
      Doctor.countDocuments({ active: true }),
      Admission.countDocuments(),
      Admission.countDocuments({ paymentStatus: "PENDING" }),
      Admission.countDocuments({ paymentStatus: "PAID" }),
      Admission.countDocuments({ paymentStatus: "FAILED" }),
      Admission.aggregate([
        { $match: { paymentStatus: "PAID" } },
        { $group: { _id: null, total: { $sum: "$fee" } } },
      ]),
    ]);

    res.json({
      overview: {
        totalDoctors,
        activeDoctors,
        inactiveDoctors: totalDoctors - activeDoctors,
        totalAdmissions,
        pendingPayments,
        paidPayments,
        failedPayments,
        paidRevenue: revenueResult[0]?.total || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// List all doctors, including inactive ones
router.get("/doctors", async (_req, res, next) => {
  try {
    const doctors = await Doctor.find().sort({
      specialty: 1,
      name: 1,
    });

    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

// Add a doctor
router.post("/doctors", async (req, res, next) => {
  try {
    const { name, specialty, qualification, fee, availableDays, active } =
      req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof specialty !== "string" ||
      !specialty.trim() ||
      fee === "" ||
      fee === null ||
      fee === undefined ||
      !Number.isFinite(Number(fee)) ||
      Number(fee) < 0
    ) {
      return res.status(400).json({
        message: "Provide a doctor name, specialty and valid fee.",
      });
    }

    if (
      availableDays !== undefined &&
      (!Array.isArray(availableDays) ||
        !availableDays.every((day) => typeof day === "string"))
    ) {
      return res.status(400).json({
        message: "availableDays must be an array of strings.",
      });
    }

    if (active !== undefined && typeof active !== "boolean") {
      return res.status(400).json({
        message: "active must be true or false.",
      });
    }

    const doctor = await Doctor.create({
      name: name.trim(),
      specialty: specialty.trim(),
      qualification:
        typeof qualification === "string" && qualification.trim()
          ? qualification.trim()
          : "MBBS",
      fee: Number(fee),
      availableDays: availableDays || [],
      active: active ?? true,
    });

    res.status(201).json({
      message: "Doctor created successfully.",
      doctor,
    });
  } catch (err) {
    next(err);
  }
});

// Edit doctor details
router.patch("/doctors/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID." });
    }

    const allowedFields = [
      "name",
      "specialty",
      "qualification",
      "fee",
      "availableDays",
      "active",
    ];

    const update = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({
        message: "Provide at least one field to update.",
      });
    }

    if ("name" in update) {
      if (typeof update.name !== "string" || !update.name.trim()) {
        return res.status(400).json({
          message: "Doctor name cannot be empty.",
        });
      }
      update.name = update.name.trim();
    }

    if ("specialty" in update) {
      if (typeof update.specialty !== "string" || !update.specialty.trim()) {
        return res.status(400).json({
          message: "Doctor specialty cannot be empty.",
        });
      }
      update.specialty = update.specialty.trim();
    }

    if ("qualification" in update) {
      if (typeof update.qualification !== "string") {
        return res.status(400).json({
          message: "Qualification must be a string.",
        });
      }
      update.qualification = update.qualification.trim();
    }

    if ("fee" in update) {
      if (
        update.fee === "" ||
        update.fee === null ||
        !Number.isFinite(Number(update.fee)) ||
        Number(update.fee) < 0
      ) {
        return res.status(400).json({
          message: "Fee must be a non-negative number.",
        });
      }
      update.fee = Number(update.fee);
    }

    if (
      "availableDays" in update &&
      (!Array.isArray(update.availableDays) ||
        !update.availableDays.every((day) => typeof day === "string"))
    ) {
      return res.status(400).json({
        message: "availableDays must be an array of strings.",
      });
    }

    if ("active" in update && typeof update.active !== "boolean") {
      return res.status(400).json({
        message: "active must be true or false.",
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json({
      message: "Doctor updated successfully.",
      doctor,
    });
  } catch (err) {
    next(err);
  }
});

// Activate or deactivate a doctor
router.patch("/doctors/:id/status", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid doctor ID." });
    }

    if (typeof req.body.active !== "boolean") {
      return res.status(400).json({
        message: "Provide active as true or false.",
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { $set: { active: req.body.active } },
      { new: true, runValidators: true },
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    res.json({
      message: doctor.active
        ? "Doctor activated successfully."
        : "Doctor deactivated successfully.",
      doctor,
    });
  } catch (err) {
    next(err);
  }
});

// List admissions
router.get("/admissions", async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.paymentStatus) {
      if (!validStatuses.includes(req.query.paymentStatus)) {
        return res.status(400).json({
          message: "Invalid payment status.",
        });
      }
      filter.paymentStatus = req.query.paymentStatus;
    }

    if (req.query.tokenDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.tokenDate)) {
        return res.status(400).json({
          message: "tokenDate must use YYYY-MM-DD format.",
        });
      }
      filter.tokenDate = req.query.tokenDate;
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 100;

    const admissions = await Admission.find(filter)
      .populate("doctor", "name specialty qualification fee")
      .populate("patient", "name email phone")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ admissions, count: admissions.length });
  } catch (err) {
    next(err);
  }
});

// List payment information from admissions
router.get("/payments", async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.status) {
      if (!validStatuses.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid payment status.",
        });
      }
      filter.paymentStatus = req.query.status;
    }

    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 100;

    const admissions = await Admission.find(filter)
      .select(
        "patient patientName doctor tokenDate tokenNumber appointmentDate fee paymentStatus paymentOrderId paymentId createdAt",
      )
      .populate("doctor", "name specialty")
      .populate("patient", "name email")
      .sort({ createdAt: -1 })
      .limit(limit);

    const payments = admissions.map((admission) => ({
      admissionId: admission._id,
      patient: admission.patient,
      patientName: admission.patientName,
      doctor: admission.doctor,
      tokenDate: admission.tokenDate,
      tokenNumber: admission.tokenNumber,
      appointmentDate: admission.appointmentDate,
      amount: admission.fee,
      status: admission.paymentStatus,
      paymentOrderId: admission.paymentOrderId || null,
      paymentId: admission.paymentId || null,
      createdAt: admission.createdAt,
    }));

    res.json({ payments, count: payments.length });
  } catch (err) {
    next(err);
  }
});

export default router;
