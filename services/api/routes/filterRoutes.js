import express from "express";
import {
  createFilter,
  getFilters,
  getFilter,
  updateFilter,
  deleteFilter,
  setDefaultFilter,
  applyFilter,
  getDefaultFilter,
} from "../controllers/filterCtrl.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* All filter routes require authentication */
router.use(protect);

router.route("/")
  .get(getFilters)
  .post(createFilter);

router.get("/default", getDefaultFilter);

router.route("/:id")
  .get(getFilter)
  .patch(updateFilter)
  .delete(deleteFilter);

router.post("/:id/set-default", setDefaultFilter);
router.post("/:id/apply", applyFilter);

export default router;
