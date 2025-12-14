import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app/app.js";
import { startReminderWorker } from "./workers/reminderWorker.js";

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

/* Start server function */
const startServer = () => {
  /* Start the reminder worker (only if MongoDB is connected) */
  if (mongoose.connection.readyState === 1) {
    startReminderWorker();
  }

  /* Start Express server */
  app.listen(PORT, () => {
    console.log(`🚀 HackSentry API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API Docs: http://localhost:${PORT}/api/hackathons`);
  });
};

/* Try to connect to MongoDB, but start server even if it fails */
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected");
      startServer();
    })
    .catch((err) => {
      console.warn("⚠️  MongoDB connection failed:", err.message);
      console.warn("⚠️  Running in demo mode (in-memory data)");
      startServer();
    });
} else {
  console.warn("⚠️  No MONGO_URI set - running in demo mode (in-memory data)");
  startServer();
}
