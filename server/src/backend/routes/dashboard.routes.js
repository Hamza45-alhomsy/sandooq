// src/backend/routes/dashboard.routes.js
import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { ensureWorkspace } from "../utils/workspace.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/stats", requireAuth, ensureWorkspace, getDashboardStats);

export default router;
