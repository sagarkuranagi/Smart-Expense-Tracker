import { Router } from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { getDemoTransactions } from "../data/demoTransactions.js";
import { requireAuth } from "../auth.js";

const router = Router();
let nextDemoId = 7;
const clean = item => ({
  _id: String(item._id),
  title: item.title,
  type: item.type,
  amount: Number(item.amount),
  category: item.category,
  date: new Date(item.date).toISOString().slice(0, 10),
  note: item.note || ""
});

function validate(body) {
  const errors = [];
  if (!body.title || !String(body.title).trim()) errors.push("Title is required.");
  if (!["income", "expense"].includes(body.type)) errors.push("Type must be income or expense.");
  if (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) errors.push("Amount must be greater than zero.");
  if (!body.category || !String(body.category).trim()) errors.push("Category is required.");
  if (!body.date || Number.isNaN(Date.parse(body.date))) errors.push("A valid date is required.");
  return errors;
}

function isDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeMerchant(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function merchantSimilarity(left, right) {
  const a = normalizeMerchant(left);
  const b = normalizeMerchant(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  const sharedWords = [...aWords].filter(word => bWords.has(word)).length;
  return sharedWords / new Set([...aWords, ...bWords]).size;
}

function findPotentialDuplicates(items, candidate) {
  const amountCents = Math.round(Number(candidate.amount) * 100);
  const candidateDate = Date.parse(`${candidate.date}T00:00:00.000Z`);
  return items
  .map(item => {
    const existingCents = Math.round(Number(item.amount) * 100);
    const existingDate = Date.parse(`${String(item.date).slice(0, 10)}T00:00:00.000Z`);
    const daysApart = Math.abs(candidateDate - existingDate) / 86400000;
    const amountMatches = Math.abs(amountCents - existingCents) <= 1;
    const titleSimilarity = merchantSimilarity(candidate.title, item.title);
    if (!amountMatches || daysApart > 3 || (daysApart !== 0 && titleSimilarity < 0.55)) return null;
    return {
      transaction: clean(item),
      confidence: Math.round(50 + (daysApart === 0 ? 25 : daysApart === 1 ? 15 : 5) + titleSimilarity * 25),
      reasons: [
        "Same amount",
        daysApart === 0 ? "Same date" : `Within ${Math.round(daysApart)} days`,
        ...(titleSimilarity >= 0.55 ? ["Similar merchant"] : [])
      ]
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 5);
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { search = "", type = "", category = "", dateFrom = "", dateTo = "" } = req.query;
    if ((dateFrom && !isDateOnly(dateFrom)) || (dateTo && !isDateOnly(dateTo))) {
      return res.status(400).json({ message: "Date filters must use YYYY-MM-DD." });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return res.status(400).json({ message: "The start date must be on or before the end date." });
    }
    if (mongoose.connection.readyState === 1) {
      const query = { userId: req.user.id };
      if (type && ["income", "expense"].includes(type)) query.type = type;
      if (category) query.category = category;
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
        if (dateTo) query.date.$lt = new Date(Date.parse(`${dateTo}T00:00:00.000Z`) + 24 * 60 * 60 * 1000);
      }
      if (search) query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } }
      ];
      const items = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
      return res.json(items.map(clean));
    }
    let items = [...getDemoTransactions(req.user.id)];
    if (dateFrom) items = items.filter(item => String(item.date).slice(0, 10) >= dateFrom);
    if (dateTo) items = items.filter(item => String(item.date).slice(0, 10) <= dateTo);
    if (type) items = items.filter(item => item.type === type);
    if (category) items = items.filter(item => item.category === category);
    if (search) {
      const s = String(search).toLowerCase();
      items = items.filter(item => [item.title, item.category, item.note].some(value => String(value || "").toLowerCase().includes(s)));
    }
    return res.json(items.sort((a, b) => new Date(b.date) - new Date(a.date)));
  } catch (error) { next(error); }
});

router.post("/duplicates", async (req, res, next) => {
  try {
    const { title, amount, date, type = "expense" } = req.body || {};
    if (typeof title !== "string" || !title.trim() || title.trim().length > 100) {
      return res.status(400).json({ message: "A merchant or transaction title is required (maximum 100 characters)." });
    }
    if (typeof amount !== "number" && typeof amount !== "string" || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > 1000000000) {
      return res.status(400).json({ message: "Enter a valid transaction amount." });
    }
    if (!isDateOnly(date)) return res.status(400).json({ message: "Enter a valid transaction date in YYYY-MM-DD format." });
    if (!["income", "expense"].includes(type)) return res.status(400).json({ message: "Type must be income or expense." });

    const candidate = { title: title.trim(), amount, date, type };
    const day = new Date(`${date}T00:00:00.000Z`);
    const from = new Date(day.getTime() - 3 * 86400000);
    const to = new Date(day.getTime() + 4 * 86400000);
    const items = mongoose.connection.readyState === 1
      ? await Transaction.find({
        userId: req.user.id,
        type,
        amount: { $gte: Math.max(0.01, Number(amount) - 0.01), $lte: Number(amount) + 0.01 },
        date: { $gte: from, $lt: to }
      }).sort({ date: -1 }).limit(100).lean()
      : getDemoTransactions(req.user.id).filter(item => item.type === type);
    res.json({ matches: findPotentialDuplicates(items, candidate) });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const item = mongoose.connection.readyState === 1
      ? (mongoose.isValidObjectId(req.params.id) ? await Transaction.findOne({ _id: req.params.id, userId: req.user.id }) : null)
      : getDemoTransactions(req.user.id).find(entry => entry._id === req.params.id);
    if (!item) return res.status(404).json({ message: "Transaction not found." });
    res.json(clean(item));
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const payload = {
      userId: req.user.id,
      title: String(req.body.title).trim(),
      type: req.body.type,
      amount: Number(req.body.amount),
      category: String(req.body.category).trim(),
      date: new Date(req.body.date),
      note: String(req.body.note || "").trim()
    };
    if (mongoose.connection.readyState === 1) {
      const created = await Transaction.create(payload);
      return res.status(201).json(clean(created));
    }
    const created = { ...payload, _id: `demo-${nextDemoId++}`, date: payload.date.toISOString().slice(0, 10) };
    getDemoTransactions(req.user.id).unshift(created);
    res.status(201).json(clean(created));
  } catch (error) { next(error); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const errors = validate(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const payload = {
      userId: req.user.id,
      title: String(req.body.title).trim(),
      type: req.body.type,
      amount: Number(req.body.amount),
      category: String(req.body.category).trim(),
      date: new Date(req.body.date),
      note: String(req.body.note || "").trim()
    };
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Transaction not found." });
      const updated = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, payload, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ message: "Transaction not found." });
      return res.json(clean(updated));
    }
    const demoItems = getDemoTransactions(req.user.id);
    const index = demoItems.findIndex(item => item._id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Transaction not found." });
    demoItems[index] = { ...payload, _id: req.params.id, date: payload.date.toISOString().slice(0, 10) };
    res.json(clean(demoItems[index]));
  } catch (error) { next(error); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Transaction not found." });
      const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
      if (!deleted) return res.status(404).json({ message: "Transaction not found." });
    } else {
      const demoItems = getDemoTransactions(req.user.id);
      const before = demoItems.length;
      demoItems.splice(0, demoItems.length, ...demoItems.filter(item => item._id !== req.params.id));
      if (demoItems.length === before) return res.status(404).json({ message: "Transaction not found." });
    }
    res.json({ message: "Transaction deleted successfully." });
  } catch (error) { next(error); }
});

export default router;
