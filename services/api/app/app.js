import express from "express";
import cors from "cors";

/* Route imports */
import hackathonRoutes from "../routes/hackathonRoutes.js";
import authRoutes from "../routes/authRoutes.js";
import bookmarkRoutes from "../routes/bookmarkRoutes.js";
import filterRoutes from "../routes/filterRoutes.js";
import searchRoutes from "../routes/searchRoutes.js";

/* Error handler imports */
import {
  notFoundHandler,
  globalErrorHandler,
} from "../middleware/globalErrHandler.js";

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

/* 404 handler - must be after all routes */
app.use(notFoundHandler);

/* Global error handler - must be last */
app.use(globalErrorHandler);

export default app;
