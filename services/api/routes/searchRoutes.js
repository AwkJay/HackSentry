import express from "express";
import {
  search,
  getSuggestions,
  getPopularSearches,
  getTrendingTags,
} from "../controllers/searchCtrl.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/* Search routes - public with optional auth for analytics */
router.get("/", optionalAuth, search);
router.get("/suggestions", getSuggestions);
router.get("/popular", getPopularSearches);
router.get("/tags/trending", getTrendingTags);

export default router;
