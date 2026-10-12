import { randomUUID } from "node:crypto";
import { Router } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { createSession, clearSession, requireAuth } from "../auth.js";
import { demoUsersByEmail, demoUsersById } from "../data/demoUsers.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = user => ({
  id: String(user._id || user.id),
  name: user.name,
  email: user.email
});

async function findUserByEmail(email) {
  if (mongoose.connection.readyState === 1) {
    return User.findOne({ email }).select("+passwordHash");
  }
  return demoUsersByEmail.get(email) || null;
}

router.post("/register", async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: "Name must be between 2 and 60 characters." });
    }
    if (email.length > 254 || !emailPattern.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ message: "Password must be at least 8 characters and no more than 72 bytes." });
    }

    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.create({ name, email, passwordHash });
    } else {
      user = { id: randomUUID(), name, email, passwordHash };
      demoUsersByEmail.set(email, user);
      demoUsersById.set(user.id, user);
    }

    createSession(res, user._id || user.id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists." });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!emailPattern.test(email) || !password) {
      return res.status(400).json({ message: "Enter your email and password." });
    }

    const user = await findUserByEmail(email);
    const validPassword = user && await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: "Email or password is incorrect." });

    createSession(res, user._id || user.id);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.status(204).end();
});

export default router;
