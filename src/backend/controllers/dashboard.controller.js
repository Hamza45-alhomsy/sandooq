// controllers/dashboard.controller.js — Dashboard statistics business logic
import prisma from "../config/database.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getDashboardStats = async (req, res) => {
  console.log("📊 Dashboard stats request from user:", req.user?.id);

  try {
    const user = req.user;
    let where = { workspaceId: getWorkspaceId(req) };

    // Check if user can view all transactions
    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: user.roleId,
        resource: "transaction",
        action: "view_all",
      },
    });
    if (!canViewAll) {
      where.userId = user.id;
    }

    // Check if user can view fund data
    const canViewFund = await prisma.permission.findFirst({
      where: {
        roleId: user.roleId,
        resource: "fund",
        action: "view",
      },
    });

    // Date range for monthly totals (current month)
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    // Fetch all stats in parallel
    const [
      totalTransactions,
      pendingTransactions,
      approvedTransactions,
      rejectedTransactions,
      fund,
      monthlyTransactions,
      monthlyIncome,
      monthlyExpense,
    ] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.count({ where: { ...where, status: "pending" } }),
      prisma.transaction.count({ where: { ...where, status: "approved" } }),
      prisma.transaction.count({ where: { ...where, status: "rejected" } }),
      canViewFund
        ? prisma.fund.findFirst({ where: { workspaceId: getWorkspaceId(req) } })
        : Promise.resolve(null),
      canViewFund
        ? prisma.fundTransaction.aggregate({
            where: {
              workspaceId: getWorkspaceId(req),
              createdAt: { gte: startOfMonth },
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
      canViewFund
        ? prisma.fundTransaction.aggregate({
            where: {
              workspaceId: getWorkspaceId(req),
              createdAt: { gte: startOfMonth },
              amount: { gt: 0 }, // Income transactions
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
      canViewFund
        ? prisma.fundTransaction.aggregate({
            where: {
              workspaceId: getWorkspaceId(req),
              createdAt: { gte: startOfMonth },
              amount: { lt: 0 }, // Expense transactions
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
    ]);

    // Recent transactions (latest 10)
    const recentTransactions = await prisma.transaction.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        items: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Build response
    const stats = {
      totalTransactions,
      pendingTransactions,
      approvedTransactions,
      rejectedTransactions,
    };

    // Only include fund data if user has permission
    if (canViewFund) {
      stats.fundBalance = fund?.currentBalance || 0;
      stats.monthlyTotal = monthlyTransactions._sum.amount || 0;
      stats.monthlyIncome = monthlyIncome._sum.amount || 0;
      stats.monthlyExpense = Math.abs(monthlyExpense._sum.amount || 0);
    }

    res.json({
      stats,
      recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};
