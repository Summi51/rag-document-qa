import crypto from "crypto";
import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { createToken, hashPassword, verifyPassword } from "../config/auth.js";

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  userId: user.userId,
  email: user.email,
  name: user.name || "",
});

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const trimmedName = String(name || "").trim();

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required",
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      userId: crypto.randomUUID(),
      email: normalizedEmail,
      name: trimmedName,
      passwordHash: hashPassword(password),
    });

    const token = createToken({ userId: user.userId, email: user.email });

    return res.status(201).json({
      success: true,
      message: "Account created",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Signup failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = createToken({ userId: user.userId, email: user.email });

    return res.json({
      success: true,
      message: "Logged in",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to log in",
    });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

router.post("/logout", authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    message: "Logged out",
  });
});

export default router;
