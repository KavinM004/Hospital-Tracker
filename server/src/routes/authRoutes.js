import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { createToken, publicUser } from "../utils/createToken.js";
import { requireAuth } from "../middleware/auth.js";
import crypto from "node:crypto";
import { sendPasswordResetEmail } from "../utils/mailer.js";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: "Name, email and password are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, phone, passwordHash });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});



router.post("/admin-login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      role: "ADMIN",
    }).select("+passwordHash");

    if (
      !user ||
      !user.passwordHash ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Invalid administrator email or password.",
      });
    }

    res.json({
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() }).select("+passwordHash");
    if (!user || !user.passwordHash || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
});

router.post("/google", async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: "Google sign-in is not configured yet." });
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Google credential is required." });
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile?.email || !profile.email_verified) return res.status(401).json({ message: "Google email could not be verified." });

    let user = await User.findOne({ email: profile.email.toLowerCase() });
    if (!user) user = await User.create({
      name: profile.name || "Patient",
      email: profile.email.toLowerCase(),
      googleId: profile.sub
    });
    else if (!user.googleId) {
      user.googleId = profile.sub;
      await user.save();
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (err) {
    res.status(401).json({ message: "Google sign-in failed. Please try again." });
  }
});

router.post("/forgot-password", async (req, res, next) => {
  let user;

  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({
        message: "Please enter your email address.",
      });
    }

    user = await User.findOne({ email });

    // Return the same message whether the account exists or not.
    const message =
      "If an account exists with that email, a password reset link will be sent.";

    if (!user) {
      return res.json({ message });
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const clientUrl = process.env.CLIENT_URL;

    if (!clientUrl) {
      throw new Error("CLIENT_URL is not configured.");
    }

    const resetUrl = `${clientUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      console.error("Password reset email failed:", emailError.message);
    }

    return res.json({ message });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!/^[a-f0-9]{64}$/i.test(token || "")) {
      return res.status(400).json({
        message: "Invalid or expired password reset link.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires +passwordHash");

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link.",
      });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.json({
      message:
        "Password reset successful. Please log in with your new password.",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;
