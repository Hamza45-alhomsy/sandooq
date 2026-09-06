// routes/audit.routes.js — Audit log routes
import express from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { requireAuth } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getAuditLogs);

export default router;
