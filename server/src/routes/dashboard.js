import { Router } from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { getDemoTransactions } from "../data/demoTransactions.js";
import { requireAuth } from "../auth.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (req, res, next) => {
  try {
    const items = mongoose.connection.readyState === 1
      ? await Transaction.find({ userId: req.user.id }).lean()
      : getDemoTransactions(req.user.id);
    const income = items.filter(item => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expenses = items.filter(item => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthlyExpenses = items
      .filter(item => item.type === "expense" && new Date(item.date).toISOString().slice(0, 7) === monthKey)
      .reduce((sum, item) => sum + Number(item.amount), 0);
    res.json({ income, expenses, balance: income - expenses, monthlyExpenses, transactionCount: items.length });
  } catch (error) { next(error); }
});

export default router;
