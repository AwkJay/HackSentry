import express from "express";
import cors from "cors";

/* Route imports */
import hackathonRoutes from "../routes/hackathonRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import bookmarkRoutes from "../routes/bookmarkRoutes.js";
import filterRoutes from "../routes/filterRoutes.js";
import searchRoutes from "../routes/searchRoutes.js";

const app = express();

/* Middleware */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Health check */
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* API Routes */
app.use("/api/hackathons", hackathonRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/filters", filterRoutes);
app.use("/api/search", searchRoutes);

/* 404 handler */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

/* Error handler */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default app;
