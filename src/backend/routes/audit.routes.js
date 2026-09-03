// routes/audit.routes.js — Audit log routes
import express from "express";
import { getAuditLogs } from "../controllers/audit.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("audit", "view"), getAuditLogs);

export default router;
