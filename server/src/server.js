import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB.");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    }
  } else {
    console.log("MONGODB_URI not set. Running with in-memory demo data (data resets on restart).");
  }
  app.listen(PORT, () => console.log(`API server running at http://localhost:${PORT}`));
}

start();
