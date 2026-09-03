// routes/auth.routes.js — Authentication routes
import express from "express";
import {
  debugVerify,
  verifyToken,
  registerUser,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/debug-verify", debugVerify);
router.post("/verify", verifyToken);
router.post("/register", registerUser);

export default router;
