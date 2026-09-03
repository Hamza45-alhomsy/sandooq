// routes/dashboard.routes.js — Dashboard statistics routes
import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/stats", requireAuth, getDashboardStats);

export default router;
