// routes/user.routes.js — User management routes
import express from "express";
import { updateUserProfile } from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/index.js";

const router = express.Router();

router.put("/:id", requireAuth, updateUserProfile);

export default router;
