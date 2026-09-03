// server.js — Main Express Application
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import prisma from "./config/database.js";

// Import routes
import {
  testRoutes,
  authRoutes,
  userRoutes,
  transactionRoutes,
  fundRoutes,
  auditRoutes,
  settingsRoutes,
  documentRoutes,
  dashboardRoutes,
  rolesRoutes,
  categoryRoutes,
  workspaceRoutes,
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const envPath = join(__dirname, "../../.env");
dotenv.config({ path: envPath });
console.log("✅ Environment loaded from:", envPath);

// ============ INITIALIZE EXPRESS APP ============
const app = express();

// ============ GLOBAL MIDDLEWARE ============
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);
app.use(express.json());

// 📁 Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// ============ MOUNT ROUTES ============
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/fund", fundRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/workspaces", workspaceRoutes);

// ============ START SERVER ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Cash Flow API running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
