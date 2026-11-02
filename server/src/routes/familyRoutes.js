import { Router } from "express";
import mongoose from "mongoose";
import FamilyMember from "../models/FamilyMember.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const allowedRelationships = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Other",
];

const allowedGenders = [
  "Female",
  "Male",
  "Other",
  "Prefer not to say",
];

// Add a family member
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, relationship, dateOfBirth, gender, phone } = req.body;

    if (!name?.trim() || !relationship || !dateOfBirth || !gender) {
      return res.status(400).json({
        message: "Name, relationship, date of birth and gender are required.",
      });
    }

    if (!allowedRelationships.includes(relationship)) {
      return res.status(400).json({
        message: "Please select a valid relationship.",
      });
    }

    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({
        message: "Please select a valid gender.",
      });
    }

    const dob = new Date(dateOfBirth);

    if (
      Number.isNaN(dob.getTime()) ||
      dob > new Date()
    ) {
      return res.status(400).json({
        message: "Please enter a valid date of birth.",
      });
    }

    const familyMember = await FamilyMember.create({
      user: req.user._id,
      name: name.trim(),
      relationship,
      dateOfBirth: dob,
      gender,
      phone: phone?.trim() || "",
    });

    res.status(201).json({
      message: "Family member added successfully.",
      familyMember,
    });
  } catch (err) {
    next(err);
  }
});

// Get the logged-in user's family members
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const familyMembers = await FamilyMember.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({ familyMembers });
  } catch (err) {
    next(err);
  }
});

// Update a family member
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid family member ID.",
      });
    }

    const { name, relationship, dateOfBirth, gender, phone } = req.body;

    if (
      !name?.trim() ||
      !relationship ||
      !dateOfBirth ||
      !gender
    ) {
      return res.status(400).json({
        message: "Name, relationship, date of birth and gender are required.",
      });
    }

    if (!allowedRelationships.includes(relationship)) {
      return res.status(400).json({
        message: "Please select a valid relationship.",
      });
    }

    if (!allowedGenders.includes(gender)) {
      return res.status(400).json({
        message: "Please select a valid gender.",
      });
    }

    const dob = new Date(dateOfBirth);

    if (Number.isNaN(dob.getTime()) || dob > new Date()) {
      return res.status(400).json({
        message: "Please enter a valid date of birth.",
      });
    }

    const familyMember = await FamilyMember.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      {
        name: name.trim(),
        relationship,
        dateOfBirth: dob,
        gender,
        phone: phone?.trim() || "",
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!familyMember) {
      return res.status(404).json({
        message: "Family member not found.",
      });
    }

    res.json({
      message: "Family member updated successfully.",
      familyMember,
    });
  } catch (err) {
    next(err);
  }
});

// Delete a family member
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid family member ID.",
      });
    }

    const familyMember = await FamilyMember.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!familyMember) {
      return res.status(404).json({
        message: "Family member not found.",
      });
    }

    res.json({
      message: "Family member deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;