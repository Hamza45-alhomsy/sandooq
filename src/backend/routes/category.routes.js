import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getCategories);
router.post(
  "/",
  requireAuth,
  requirePermission("category", "manage"),
  createCategory,
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("category", "manage"),
  updateCategory,
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("category", "manage"),
  deleteCategory,
);

export default router;
