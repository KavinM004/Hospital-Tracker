import mongoose from "mongoose";

const familyMemberSchema = new mongoose.Schema(
  {
    // The account holder who manages this family member
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    relationship: {
      type: String,
      required: true,
      enum: [
        "Self",
        "Spouse",
        "Son",
        "Daughter",
        "Father",
        "Mother",
        "Brother",
        "Sister",
        "Other",
      ],
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Female", "Male", "Other", "Prefer not to say"],
      required: true,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("FamilyMember", familyMemberSchema);
