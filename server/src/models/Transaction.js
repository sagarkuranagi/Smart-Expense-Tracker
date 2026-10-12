import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, required: true, trim: true, maxlength: 40 },
  date: { type: Date, required: true },
  note: { type: String, trim: true, maxlength: 300, default: "" }
}, { timestamps: true });

export default mongoose.model("Transaction", transactionSchema);
