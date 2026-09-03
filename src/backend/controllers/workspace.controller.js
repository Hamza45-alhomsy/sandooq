import { z } from "zod";
import prisma from "../config/database.js";
import { createInvitationToken } from "../utils/workspace.js";

export const listWorkspaces = async (req, res) => {
  res.json(
    (req.user.memberships || []).map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      role: membership.role.name,
    })),
  );
};

export const createWorkspace = async (req, res) => {
  const schema = z.object({ name: z.string().trim().min(1) });
  const { name } = schema.parse(req.body);
  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  const workspace = await prisma.workspace.create({
    data: {
      name,
      ownerId: req.user.id,
      members: { create: { userId: req.user.id, roleId: adminRole.id } },
    },
    include: { members: { include: { role: true } } },
  });
  res
    .status(201)
    .json({ id: workspace.id, name: workspace.name, role: "admin" });
};

export const inviteToWorkspace = async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Only workspace admins can invite users" });
  }
  const schema = z.object({
    email: z.string().email(),
    roleId: z.number().int(),
  });
  const { email, roleId } = schema.parse(req.body);
  const invitation = await prisma.workspaceInvitation.create({
    data: {
      email: email.toLowerCase(),
      roleId,
      workspaceId: req.user.workspaceId,
      invitedById: req.user.id,
      token: createInvitationToken(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  res
    .status(201)
    .json({ token: invitation.token, expiresAt: invitation.expiresAt });
};

export const acceptInvitation = async (req, res) => {
  const invitation = await prisma.workspaceInvitation.findUnique({
    where: { token: req.params.token },
  });
  if (
    !invitation ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date()
  ) {
    return res.status(400).json({ error: "Invitation is invalid or expired" });
  }
  if (invitation.email !== req.user.email.toLowerCase()) {
    return res
      .status(403)
      .json({ error: "Invitation email does not match account" });
  }
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspaceId,
        userId: req.user.id,
      },
    },
    update: { roleId: invitation.roleId },
    create: {
      workspaceId: invitation.workspaceId,
      userId: req.user.id,
      roleId: invitation.roleId,
    },
  });
  await prisma.workspaceInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });
  res.json({ workspaceId: invitation.workspaceId });
};
