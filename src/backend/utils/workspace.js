// src/backend/utils/workspace.js
import prisma from "../config/database.js";
import crypto from "crypto";

/**
 * Ensures the user has a valid workspace and attaches workspace info to req.user.
 */
export async function ensureWorkspace(req, res, next) {
  try {
    let workspaceId = req.headers["x-workspace-id"]
      ? parseInt(req.headers["x-workspace-id"])
      : null;

    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: { workspace: true },
    });

    if (userWorkspaces.length === 0) {
      return res.status(403).json({
        error: "You are not a member of any workspace.",
      });
    }

    if (!workspaceId) {
      workspaceId = userWorkspaces[0].workspaceId;
    }

    const membership = userWorkspaces.find(
      (wm) => wm.workspaceId === workspaceId,
    );

    if (!membership) {
      return res.status(403).json({
        error: "You do not have access to this workspace.",
      });
    }

    req.user.workspaceId = workspaceId;
    req.user.workspace = membership.workspace;
    req.user.memberships = userWorkspaces;

    next();
  } catch (error) {
    console.error("Workspace middleware error:", error);
    return res.status(500).json({ error: "Workspace verification failed" });
  }
}

// ✅ Get workspace ID from request
export function getWorkspaceId(req) {
  return req.user?.workspaceId || null;
}

// ✅ Generate a secure invitation token
export function createInvitationToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ✅ Create a workspace invitation
export async function createWorkspaceInvitation({
  email,
  workspaceId,
  invitedBy,
  expiresInHours = 72, // default: 3 days
}) {
  const token = createInvitationToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return await prisma.workspaceInvitation.create({
    data: {
      email,
      token,
      workspaceId,
      invitedById: invitedBy,
      expiresAt,
      status: "pending",
    },
  });
}

// ✅ Verify an invitation token
export async function verifyInvitationToken(token) {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invitation) {
    return { valid: false, error: "Invitation not found" };
  }

  if (invitation.status !== "pending") {
    return {
      valid: false,
      error: `Invitation is already ${invitation.status}`,
    };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: "Invitation has expired" };
  }

  return { valid: true, invitation };
}
