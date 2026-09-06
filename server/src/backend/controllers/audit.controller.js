// controllers/audit.controller.js — Audit log business logic
import prisma from "../config/database.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getAuditLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0, action, userId } = req.query;

    const where = { workspaceId: getWorkspaceId(req) };
    if (action) where.action = action;
    if (userId) where.userId = parseInt(userId);

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      data: logs,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};
