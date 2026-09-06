// routes/document.routes.js — Document upload routes
import express from "express";
import { uploadDocument } from "../controllers/document.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.post("/upload", requireAuth, upload.single("file"), uploadDocument);

export default router;
