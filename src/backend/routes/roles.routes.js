// routes/roles.routes.js — Role management routes
import express from "express";
import { getAllRoles } from "../controllers/roles.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("user", "manage"), getAllRoles);

export default router;
