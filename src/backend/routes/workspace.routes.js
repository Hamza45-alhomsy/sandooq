import express from "express";
import {
  listWorkspaces,
  createWorkspace,
  inviteToWorkspace,
  acceptInvitation,
} from "../controllers/workspace.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", requireAuth, listWorkspaces);
router.post("/", requireAuth, createWorkspace);
router.post("/invite", requireAuth, inviteToWorkspace);
router.post("/invitations/:token/accept", requireAuth, acceptInvitation);

export default router;
