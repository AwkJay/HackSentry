import express from "express";
import {
  createBookmark,
  getBookmarks,
  getBookmark,
  updateBookmark,
  removeBookmark,
  checkBookmark,
  toggleBookmark,
} from "../controllers/bookmarkCtrl.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* All bookmark routes require authentication */
router.use(protect);

router.route("/")
  .get(getBookmarks)
  .post(createBookmark);

router.post("/toggle", toggleBookmark);

router.get("/check/:hackathonId", checkBookmark);

router.route("/:id")
  .get(getBookmark)
  .patch(updateBookmark)
  .delete(removeBookmark);

export default router;
