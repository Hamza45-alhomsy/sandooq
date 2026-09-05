import express from "express";
import {
  listWorkspaces,
  createWorkspace,
  inviteToWorkspace,
  acceptInvitation,
} from "../controllers/workspace.controller.js";
import { authenticateUser, requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", requireAuth, listWorkspaces);
router.post("/", requireAuth, createWorkspace);
router.post("/invite", requireAuth, inviteToWorkspace);
router.post("/invitations/:token/accept", authenticateUser, acceptInvitation);

export default router;
