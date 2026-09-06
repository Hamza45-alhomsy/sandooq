import prisma from "../config/database.js";

export const getDashboardStats = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;
    const transactionWhere = { workspaceId, userId: req.user.id };

    const totalTransactions = await prisma.transaction.count({
      where: transactionWhere,
    });

    let monthlyTotal = 0;
    await prisma.fund.upsert({
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
    const balanceTotals = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        ...transactionWhere,
        status: "approved",
        type: { in: ["income", "expense"] },
      },
      _sum: { totalAmount: true },
    });
    const income =
      balanceTotals.find((total) => total.type === "income")?._sum
        .totalAmount || 0;
    const expenses =
      balanceTotals.find((total) => total.type === "expense")?._sum
        .totalAmount || 0;
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const monthlyTransactions = await prisma.fundTransaction.aggregate({
      where: {
        workspaceId,
        createdAt: { gte: startOfMonth },
        fund: { userId: req.user.id },
      },
      _sum: { amount: true },
    });
    monthlyTotal = monthlyTransactions._sum.amount || 0;

    const recentTransactions = await prisma.transaction.findMany({
      where: transactionWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { fullName: true, email: true } },
        items: { include: { category: true } },
      },
    });

    res.json({
      stats: {
        totalTransactions,
        fundBalance: income - expenses,
        monthlyTotal,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};
