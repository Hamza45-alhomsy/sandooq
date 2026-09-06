// routes/settings.routes.js — Application settings routes
import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller.js";
import { requireAuth } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getSettings);

router.put("/", requireAuth, updateSettings);

export default router;
