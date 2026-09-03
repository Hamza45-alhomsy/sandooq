// routes/settings.routes.js — Application settings routes
import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getSettings);

router.put(
  "/",
  requireAuth,
  requirePermission("setting", "manage"),
  updateSettings,
);

export default router;
