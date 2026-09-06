// src/backend/utils/audit.js
import prisma from "../config/database.js";
import { getWorkspaceId } from "./workspace.js";

export async function createAuditLog(
  userId,
  action,
  entityType,
  entityId,
  details,
  req,
) {
  const workspaceId = getWorkspaceId(req);

  return await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details: details || {},
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"],
      workspaceId,
    },
  });
}
