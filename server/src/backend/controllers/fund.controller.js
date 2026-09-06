// controllers/fund.controller.js — Fund management business logic
import prisma from "../config/database.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getFund = async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const fund = await prisma.fund.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.id,
        },
      },
      update: {},
      create: {
        name: "My Fund",
        currency: "SYP",
        workspaceId,
        userId: req.user.id,
      },
    });

    const totals = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        workspaceId,
        userId: req.user.id,
        status: "approved",
        type: { in: ["income", "expense"] },
      },
      _sum: { totalAmount: true },
    });
    const income =
      totals.find((total) => total.type === "income")?._sum.totalAmount || 0;
    const expenses =
      totals.find((total) => total.type === "expense")?._sum.totalAmount || 0;

    res.json({ ...fund, currentBalance: income - expenses });
  } catch (error) {
    console.error("Get fund error:", error);
    res.status(500).json({ error: "Failed to fetch fund" });
  }
};
