import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { requireAuth } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getCategories);
router.post("/", requireAuth, createCategory);
router.put("/:id", requireAuth, updateCategory);
router.delete("/:id", requireAuth, deleteCategory);

export default router;
