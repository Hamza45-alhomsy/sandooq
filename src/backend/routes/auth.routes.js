// src/backend/routes/auth.routes.js
import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { verifyToken, registerUser } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/verify", requireAuth, verifyToken);
router.post("/register", registerUser);

export default router;
