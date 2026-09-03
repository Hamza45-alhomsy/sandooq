// routes/user.routes.js — User management routes
import express from "express";
import {
  getAllUsers,
  createUser,
  updateUserProfile,
  updateUserRole,
} from "../controllers/user.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, requirePermission("user", "manage"), getAllUsers);

router.post(
  "/create",
  requireAuth,
  requirePermission("user", "manage"),
  createUser,
);

router.put("/:id", requireAuth, updateUserProfile);
router.put(
  "/:id/role",
  requireAuth,
  requirePermission("user", "manage"),
  updateUserRole,
);

export default router;
