// controllers/fund.controller.js — Fund management business logic
import prisma from "../config/database.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getFund = async (req, res) => {
  try {
    const fund = await prisma.fund.findFirst({
      where: { workspaceId: getWorkspaceId(req) },
    });
    if (!fund) return res.status(404).json({ error: "Fund not found" });
    res.json(fund);
  } catch (error) {
    console.error("Get fund error:", error);
    res.status(500).json({ error: "Failed to fetch fund" });
  }
};
