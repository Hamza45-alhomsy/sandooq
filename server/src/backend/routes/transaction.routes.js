// routes/transaction.routes.js — Transaction management routes
import express from "express";
import {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transaction.controller.js";
import { requireAuth } from "../middlewares/index.js";

const router = express.Router();

router.get("/", requireAuth, getAllTransactions);
router.get("/:id", requireAuth, getTransactionById);
router.post("/create", requireAuth, createTransaction);
router.put("/:id", requireAuth, updateTransaction);
router.delete("/:id", requireAuth, deleteTransaction);

export default router;
