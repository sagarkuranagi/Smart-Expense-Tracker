import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/User.js";
import { demoUsersById } from "./data/demoUsers.js";

const COOKIE_NAME = "expense_tracker_session";
const TOKEN_TTL = "7d";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error("JWT_SECRET must be set to at least 32 characters in production.");
}

const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using an ephemeral development secret; sessions reset on restart.");
}

export function createSession(res, userId) {
  const token = jwt.sign({}, jwtSecret, { subject: String(userId), expiresIn: TOKEN_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/"
  });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "Please sign in to continue." });

    const payload = jwt.verify(token, jwtSecret);
    const user = mongoose.connection.readyState === 1
      ? await User.findById(payload.sub).select("_id name email").lean()
      : demoUsersById.get(payload.sub);
    if (!user) return res.status(401).json({ message: "Your session is no longer valid. Please sign in again." });

    req.user = { id: String(user._id || user.id), name: user.name, email: user.email };
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }
    next(error);
  }
}
