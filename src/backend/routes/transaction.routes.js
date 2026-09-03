// routes/transaction.routes.js — Transaction management routes
import express from "express";
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  approveTransaction,
  rejectTransaction,
} from "../controllers/transaction.controller.js";
import { requireAuth, requirePermission } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getAllTransactions);
router.get("/:id", requireAuth, getTransactionById);
router.post(
  "/create",
  requireAuth,
  requirePermission("transaction", "create"),
  createTransaction,
);
router.put("/:id", requireAuth, updateTransaction);
router.post(
  "/:id/approve",
  requireAuth,
  requirePermission("transaction", "approve"),
  approveTransaction,
);
router.post(
  "/:id/reject",
  requireAuth,
  requirePermission("transaction", "approve"),
  rejectTransaction,
);

export default router;
