// controllers/settings.controller.js — Settings management business logic
import { z } from "zod";
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { workspaceId: getWorkspaceId(req) },
      orderBy: { group: "asc" },
    });
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const schema = z.array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    );
    const data = schema.parse(req.body);

    const updates = await prisma.$transaction(
      data.map((item) =>
        prisma.setting.upsert({
          where: {
            workspaceId_key: {
              workspaceId: getWorkspaceId(req),
              key: item.key,
            },
          },
          update: { value: item.value },
          create: {
            key: item.key,
            value: item.value,
            group: "company",
            workspaceId: getWorkspaceId(req),
          },
        }),
      ),
    );

    await createAuditLog(
      req.user.id,
      "UPDATE_SETTINGS",
      "Setting",
      1,
      { updated: data.map((d) => d.key) },
      req,
    );

    res.json(updates);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};
