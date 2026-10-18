import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function createAdmin() {
  const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Missing MONGO_URI, ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD in server/.env",
    );
  }

  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("Use an administrator password of at least 12 characters.");
  }

  await mongoose.connect(MONGO_URI);

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email });

  if (existingUser && existingUser.role !== "ADMIN") {
    throw new Error(
      "This email already belongs to a non-admin account. Choose a different email.",
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existingUser) {
    existingUser.name = ADMIN_NAME.trim();
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
    console.log(`Administrator password updated for ${email}`);
  } else {
    await User.create({
      name: ADMIN_NAME.trim(),
      email,
      passwordHash,
      role: "ADMIN",
    });
    console.log(`Administrator account created for ${email}`);
  }
}

try {
  await createAdmin();
} catch (error) {
  console.error("Admin setup failed:", error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}