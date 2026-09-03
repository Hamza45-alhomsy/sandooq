// routes/fund.routes.js — Fund management routes
import express from "express";
import { getFund } from "../controllers/fund.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", requireAuth, getFund);

export default router;
