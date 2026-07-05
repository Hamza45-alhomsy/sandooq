import express from "express";
import cors from "cors";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const app = express();

// Allow your Next.js app to talk to this backend
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
// Load your Firebase  key
let serviceAccount;
try {
  serviceAccount = require("./service-account-key.json");
} catch (error) {
  console.error("❌ FATAL ERROR: 'service-account-key.json' not found!");
  console.error(
    "Please download it from Firebase and put it in the root folder.",
  );
  process.exit(1); // Stop the server
}

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// --- API ROUTES ---

// Simple test route
app.get("/", (req, res) => {
  res.send(
    "<h1>🔥 Cash Flow Backend is Running</h1><p>API is active on /api/...</p>",
  );
});

app.get("/api/test", async (req, res) => {
  res.json({ message: "Backend is running perfectly!" });
});

// The Secure Execute Order Route
app.post("/api/execute-order", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Run the secure Firestore Transaction
    const newBalance = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection("orders").doc(orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      if (orderData.status !== "approved") {
        throw new Error("Order must be approved first");
      }

      const fundRef = db.collection("funds").doc("MAIN_FUND");
      const fundDoc = await transaction.get(fundRef);

      if (!fundDoc.exists) {
        throw new Error("Fund not found");
      }

      const currentBalance = fundDoc.data().currentBalance || 0;

      if (
        orderData.orderType === "out" &&
        orderData.totalAmount > currentBalance
      ) {
        throw new Error("Insufficient fund balance");
      }

      // Calculate new balance
      const calculatedBalance =
        orderData.orderType === "out"
          ? currentBalance - orderData.totalAmount
          : currentBalance + orderData.totalAmount;

      // 1. Update Fund
      transaction.update(fundRef, { currentBalance: calculatedBalance });

      // 2. Create Transaction Record
      const txRef = db.collection("transactions").doc();
      transaction.set(txRef, {
        transactionType: orderData.orderType,
        fundId: "MAIN_FUND",
        amount: orderData.totalAmount,
        balanceBefore: currentBalance,
        balanceAfter: calculatedBalance,
        orderId: orderId,
        description: `Execution of order ${orderData.orderNumber || orderId}`,
        transactionDate: FieldValue.serverTimestamp(), // Fixed!
      });

      // 3. Update Order Status
      transaction.update(orderRef, {
        status: "executed",
        executedAt: FieldValue.serverTimestamp(), // Fixed!
      });

      return calculatedBalance;
    });

    // Send success response
    res.status(200).json({ success: true, newBalance: newBalance });
  } catch (error) {
    console.error("Transaction failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 Backend is running on http://localhost:${PORT}`);
});
