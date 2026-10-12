import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import transactionsRouter from "./routes/transactions.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", databaseMode: process.env.MONGODB_URI ? "configured" : "demo" });
});
app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((_req, res) => res.status(404).json({ message: "Route not found." }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === "ValidationError") return res.status(400).json({ message: "Invalid transaction data." });
  res.status(500).json({ message: "Something went wrong on the server." });
});

export default app;
