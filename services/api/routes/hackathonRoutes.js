import express from "express";
import {
  getHackathons,
  getSingleHackathon,
  getTrendingHackathons,
  getClosingSoon,
  getUrgent,
  getSimilarHackathons,
  getStats,
} from "../controllers/hackathonCtrl.js";

const router = express.Router();

/* Stats & special endpoints first (before :slug) */
router.get("/stats", getStats);
router.get("/trending", getTrendingHackathons);
router.get("/closing-soon", getClosingSoon);
router.get("/urgent", getUrgent);

/* Main listing */
router.get("/", getHackathons);

/* Single hackathon routes */
router.get("/:slug", getSingleHackathon);
router.get("/:slug/similar", getSimilarHackathons);

export default router;
