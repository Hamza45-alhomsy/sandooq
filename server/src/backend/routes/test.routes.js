// routes/test.routes.js — Health check route
import express from "express";
import { healthCheck } from "../controllers/test.controller.js";

const router = express.Router();

router.get("/", healthCheck);

export default router;
