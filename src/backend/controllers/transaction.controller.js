// controllers/transaction.controller.js — Transaction management business logic
import { z } from "zod";
import prisma from "../config/database.js";
import { generateTransactionNumber, createAuditLog } from "../utils/index.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getAllTransactions = async (req, res) => {
  try {
    const user = req.user;
    let where = { workspaceId: getWorkspaceId(req) };

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

    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      start.setHours(0, 0, 0, 0);
      where.createdAt = { ...where.createdAt, gte: start };
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.type) {
      where.type = req.query.type;
    }
    if (req.query.search) {
      where.OR = [
        { transactionNumber: { contains: req.query.search } },
        { description: { contains: req.query.search } },
        { user: { fullName: { contains: req.query.search } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: {
          include: { category: true },
        },
        documents: true,
        fundTransactions: true,
        _count: { select: { items: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId: getWorkspaceId(req) },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: {
          include: { category: true },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
        fundTransactions: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: req.user.roleId,
        resource: "transaction",
        action: "view_all",
      },
    });
    if (!canViewAll && transaction.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
};

export const createTransaction = async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(["income", "expense"]),
      description: z.string().optional(),
      items: z
        .array(
          z.object({
            description: z.string().min(1),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            categoryId: z.number().int().nullable().optional(),
          }),
        )
        .min(1),
    });

    const data = schema.parse(req.body);
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Fetch require_approval setting
    const requireApprovalSetting = await prisma.setting.findFirst({
      where: { key: "require_approval", workspaceId: getWorkspaceId(req) },
    });
    const requireApproval = requireApprovalSetting?.value !== "false";

    const newTransaction = await prisma.$transaction(async (tx) => {
      const transactionNumber = generateTransactionNumber();

      // Determine initial status
      let status = requireApproval ? "pending" : "approved";

      const transaction = await tx.transaction.create({
        data: {
          transactionNumber,
          type: data.type,
          status: status,
          totalAmount,
          description: data.description,
          userId: req.user.id,
          workspaceId: getWorkspaceId(req),
        },
      });

      await tx.transactionItem.createMany({
        data: data.items.map((item) => ({
          transactionId: transaction.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          categoryId: item.categoryId ?? null,
        })),
      });

      // If approval is NOT required, immediately update fund
      if (!requireApproval) {
        const fund = await tx.fund.findFirst({
          where: { workspaceId: getWorkspaceId(req) },
        });
        if (!fund) throw new Error("Fund not found");

        const newBalance =
          transaction.type === "income"
            ? fund.currentBalance + transaction.totalAmount
            : fund.currentBalance - transaction.totalAmount;

        await tx.fund.update({
          where: { id: fund.id },
          data: { currentBalance: newBalance },
        });

        const signedAmount =
          transaction.type === "income"
            ? transaction.totalAmount
            : -transaction.totalAmount;
        await tx.fundTransaction.create({
          data: {
            transactionId: transaction.id,
            fundId: fund.id,
            workspaceId: getWorkspaceId(req),
            amount: signedAmount,
            balanceBefore: fund.currentBalance,
            balanceAfter: newBalance,
            description:
              transaction.description || transaction.transactionNumber,
          },
        });

        // Set approved fields (since it's automatically approved)
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            approvedById: req.user.id,
            approvedAt: new Date(),
          },
        });
      }

      return transaction;
    });

    await createAuditLog(
      req.user.id,
      "CREATE_TRANSACTION",
      "Transaction",
      newTransaction.id,
      {
        transactionNumber: newTransaction.transactionNumber,
        totalAmount,
        status: newTransaction.status,
      },
      req,
      newTransaction.id,
    );

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error("Create transaction error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const user = req.user;

    // Schema with updatedAt for version check
    const schema = z.object({
      type: z.enum(["income", "expense"]),
      description: z.string().optional(),
      items: z
        .array(
          z.object({
            description: z.string().min(1, "Description is required"),
            quantity: z.number().positive("Quantity must be greater than 0"),
            unitPrice: z.number().positive("Unit price must be greater than 0"),
            categoryId: z.number().int().nullable().optional(),
          }),
        )
        .min(1, "At least one item is required"),
      updatedAt: z.string().datetime(),
    });

    const data = schema.parse(req.body);

    // Fetch current transaction
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId: getWorkspaceId(req) },
      include: { items: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // ✅ Only the owner can edit
    if (transaction.userId !== user.id) {
      return res.status(403).json({
        error: "You can only edit your own transactions",
      });
    }

    // ✅ Only pending transactions can be edited
    if (transaction.status !== "pending") {
      return res.status(400).json({
        error: "Only pending transactions can be edited",
      });
    }

    // 🔐 CONFLICT CHECK: Did someone else modify this transaction since the user loaded it?
    if (transaction.updatedAt.toISOString() !== data.updatedAt) {
      return res.status(409).json({
        error:
          "The transaction has been modified by another user. Please refresh and try again.",
      });
    }

    // Calculate total amount
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // Update transaction and items in a transaction
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          type: data.type,
          description: data.description,
          totalAmount: totalAmount,
        },
      });

      // Delete old items
      await tx.transactionItem.deleteMany({
        where: { transactionId: transactionId },
      });

      // Create new items
      await tx.transactionItem.createMany({
        data: data.items.map((item) => ({
          transactionId: transactionId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          categoryId: item.categoryId ?? null,
        })),
      });

      return updated;
    });

    // Log audit
    await createAuditLog(
      user.id,
      "UPDATE_TRANSACTION",
      "Transaction",
      transactionId,
      { transactionNumber: transaction.transactionNumber },
      req,
      transactionId,
    );

    res.json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Failed to update transaction" });
  }
};

export const approveTransaction = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId: getWorkspaceId(req) },
    });
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });
    if (transaction.status !== "pending") {
      return res.status(400).json({ error: "Transaction is not pending" });
    }

    // ✅ Approve + update fund
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: "approved",
          approvedBy: { connect: { id: req.user.id } },
          approvedAt: new Date(),
        },
      });

      // 2. Get fund
      const fund = await tx.fund.findFirst({
        where: { workspaceId: getWorkspaceId(req) },
      });
      if (!fund) throw new Error("Fund not found");

      // 3. Calculate new balance
      const newBalance =
        transaction.type === "income"
          ? fund.currentBalance + transaction.totalAmount
          : fund.currentBalance - transaction.totalAmount;

      // 4. Update fund
      await tx.fund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance },
      });

      // 5. Create transaction
      const signedAmount =
        transaction.type === "income"
          ? transaction.totalAmount
          : -transaction.totalAmount;
      await tx.fundTransaction.create({
        data: {
          transactionId: transaction.id,
          fundId: fund.id,
          workspaceId: getWorkspaceId(req),
          amount: signedAmount,
          balanceBefore: fund.currentBalance,
          balanceAfter: newBalance,
          description: transaction.description || transaction.transactionNumber,
        },
      });

      return updatedTransaction;
    });

    await createAuditLog(
      req.user.id,
      "APPROVE_TRANSACTION",
      "Transaction",
      transactionId,
      { transactionNumber: transaction.transactionNumber },
      req,
      transactionId,
    );

    res.json(result);
  } catch (error) {
    console.error("Approve transaction error:", error);
    res.status(500).json({ error: "Failed to approve transaction" });
  }
};

export const rejectTransaction = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { reason } = req.body;

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId: getWorkspaceId(req) },
      include: { fundTransactions: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Only pending or approved transactions can be rejected
    if (transaction.status !== "pending" && transaction.status !== "approved") {
      return res.status(400).json({
        error: "Only pending or approved transactions can be rejected",
      });
    }

    // ✅ If the transaction is approved (fund was updated), reverse the transaction
    if (transaction.status === "approved") {
      const fund = await prisma.fund.findFirst({
        where: { workspaceId: getWorkspaceId(req) },
      });
      if (!fund) throw new Error("Fund not found");

      // Calculate reversal amount (opposite of the original effect)
      const reversalAmount =
        transaction.type === "income"
          ? -transaction.totalAmount
          : transaction.totalAmount;

      const newBalance = fund.currentBalance + reversalAmount;

      // Update fund
      await prisma.fund.update({
        where: { id: fund.id },
        data: { currentBalance: newBalance },
      });

      // Create reversal transaction
      await prisma.fundTransaction.create({
        data: {
          transactionId: transaction.id,
          fundId: fund.id,
          workspaceId: getWorkspaceId(req),
          amount: reversalAmount,
          balanceBefore: fund.currentBalance,
          balanceAfter: newBalance,
          description: `Reversal of rejected transaction ${transaction.transactionNumber}`,
        },
      });

      // Log the reversal
      await createAuditLog(
        req.user.id,
        "REJECT_TRANSACTION_REVERSAL",
        "Transaction",
        transactionId,
        {
          transactionNumber: transaction.transactionNumber,
          reason,
          reversalAmount,
        },
        req,
        transactionId,
      );
    }

    // Update transaction status to rejected
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "rejected",
        approvedById: req.user.id,
        notes: reason || "Transaction rejected",
      },
    });

    await createAuditLog(
      req.user.id,
      "REJECT_TRANSACTION",
      "Transaction",
      transactionId,
      { transactionNumber: transaction.transactionNumber, reason },
      req,
      transactionId,
    );

    res.json({
      message:
        "Transaction rejected successfully" +
        (transaction.status === "approved"
          ? " (fund balance has been reversed)"
          : ""),
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error("Reject transaction error:", error);
    res.status(500).json({ error: "Failed to reject transaction" });
  }
};
