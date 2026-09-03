import crypto from "crypto";
import prisma from "../config/database.js";

export const getWorkspaceId = (req) => req.user?.workspaceId || null;

export const ensureWorkspace = async (userId, name) => {
  const existing = await prisma.workspaceMembership.findFirst({
    where: { userId },
    include: { workspace: true, role: { include: { permissions: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  if (!adminRole) throw new Error("Admin role is not configured");

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: name?.trim() || "My Company", ownerId: userId },
    });
    return tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId, roleId: adminRole.id },
      include: { workspace: true, role: { include: { permissions: true } } },
    });
  });
};

export const createInvitationToken = () =>
  crypto.randomBytes(32).toString("hex");
