// server.js — ES Module version with Local File Storage
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { z } from "zod";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import fs from "fs";
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Firebase Admin (modular)
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account JSON
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, "../../service-account-key.json"), "utf-8"),
);

// Load .env from project root
const envPath = join(__dirname, "../../.env");
dotenv.config({ path: envPath });

console.log("✅ Environment loaded from:", envPath);

// ============ INITIALIZE ============
const app = express();
const prisma = new PrismaClient();

// Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});
const auth = getAuth();

// ============ MIDDLEWARE ============
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());

// 📁 Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// 📁 Multer: Save files to disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ============ TEMPORARY DEBUG ROUTE ============
app.post("/api/debug-verify", async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = await auth.verifyIdToken(token);
    res.json({ success: true, decoded });
  } catch (error) {
    res.status(401).json({
      error: error.message,
      code: error.code,
      details: error.toString(),
    });
  }
});

// ============ AUTH MIDDLEWARE ============
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    const user = await prisma.user.findUnique({
      where: { uid: firebaseUid },
      include: {
        role: {
          include: {
            permissions: true, // ✅ Include permissions
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found in database" });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: "Account deactivated" });
    }

    // ✅ Attach permissions to req.user
    req.user = {
      ...user,
      permissions: user.role?.permissions || [],
    };
    req.firebaseUid = firebaseUid;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}; // ============ PERMISSION MIDDLEWARE ============
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const permission = await prisma.permission.findFirst({
        where: {
          roleId: req.user.roleId,
          resource: resource,
          action: action,
        },
      });

      if (!permission) {
        return res
          .status(403)
          .json({ error: `Missing permission: ${resource}:${action}` });
      }
      next();
    } catch (error) {
      console.error("Permission error:", error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// ============ HELPERS ============
function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${y}${m}${d}-${rand}`;
}

async function createAuditLog(
  userId,
  action,
  entityType,
  entityId,
  details,
  req,
  orderId = null,
) {
  return await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      details: details || {},
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    },
  });
}

// ============ HEALTH CHECK ============
app.get("/api/test", (req, res) => {
  res.json({ status: "OK", message: "Cash Flow API is running" });
});

// ============ AUTH ============
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const decodedToken = await auth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    const user = await prisma.user.findUnique({
      where: { uid: firebaseUid },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found. Please contact administrator.",
        exists: false,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Account deactivated.",
        exists: true,
        isActive: false,
      });
    }

    await createAuditLog(
      user.id,
      "LOGIN",
      "User",
      user.id,
      { email: user.email },
      req,
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null,
        role: user.role.name,
        permissions: user.role.permissions.map(
          (p) => `${p.resource}:${p.action}`,
        ),
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ============ PUBLIC REGISTRATION ============
app.post("/api/auth/register", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      phone: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const firebaseUser = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });

    const defaultRole = await prisma.role.findUnique({
      where: { name: "client" },
    });
    const roleId = defaultRole?.id || 3;

    const user = await prisma.user.create({
      data: {
        uid: firebaseUser.uid,
        email: data.email,
        fullName: data.fullName,
        roleId: roleId,
        phone: data.phone || null,
        isActive: true,
      },
    });

    await createAuditLog(
      user.id,
      "REGISTER",
      "User",
      user.id,
      { email: user.email },
      req,
    );

    res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }

    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Failed to register user" });
  }
});

// ============ USERS ============
app.get(
  "/api/users",
  requireAuth,
  requirePermission("user", "manage"),
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

app.post(
  "/api/users/create",
  requireAuth,
  requirePermission("user", "manage"),
  async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(2),
        roleId: z.number().int(),
        phone: z.string().optional(),
      });

      const data = schema.parse(req.body);

      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const firebaseUser = await auth.createUser({
        email: data.email,
        password: data.password,
        displayName: data.fullName,
      });

      const user = await prisma.user.create({
        data: {
          uid: firebaseUser.uid,
          email: data.email,
          fullName: data.fullName,
          roleId: data.roleId,
          phone: data.phone,
          isActive: true,
        },
        include: { role: true },
      });

      await createAuditLog(
        req.user.id,
        "CREATE_USER",
        "User",
        user.id,
        { email: user.email, role: user.role.name },
        req,
      );

      res.status(201).json(user);
    } catch (error) {
      console.error("Create user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({ error: "Email exists in Firebase" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

// ============ USER PROFILE UPDATE ============
app.put("/api/users/:id", requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { fullName, phone } = req.body;

    const isSelf = req.user.id === userId;
    const isAdmin = req.user.permissions?.some(
      (p) => p.resource === "user" && p.action === "manage",
    );

    if (!isSelf && !isAdmin) {
      return res
        .status(403)
        .json({ error: "You can only update your own profile" });
    }

    const schema = z.object({
      fullName: z.string().min(2).optional(),
      phone: z.string().optional().nullable(),
    });
    const data = schema.parse(req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      include: { role: true },
    });

    if (data.fullName) {
      try {
        const firebaseUser = await auth.getUser(updatedUser.uid);
        if (firebaseUser.displayName !== data.fullName) {
          await auth.updateUser(updatedUser.uid, {
            displayName: data.fullName,
          });
        }
      } catch (firebaseError) {
        console.warn("Could not update Firebase displayName:", firebaseError);
      }
    }

    await createAuditLog(
      req.user.id,
      "UPDATE_PROFILE",
      "User",
      userId,
      { updated: Object.keys(data) },
      req,
    );

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        role: updatedUser.role.name,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ============ ORDERS ============
app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: user.roleId,
        resource: "order",
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
        { orderNumber: { contains: req.query.search } },
        { description: { contains: req.query.search } },
        { user: { fullName: { contains: req.query.search } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
        executedBy: { select: { id: true, fullName: true } },
        items: {
          include: { category: true },
        },
        documents: true,
        transaction: true,
        _count: { select: { items: true, documents: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        approvedBy: { select: { id: true, fullName: true } },
        executedBy: { select: { id: true, fullName: true } },
        items: {
          include: { category: true },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, fullName: true } } },
        },
        transaction: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: req.user.roleId,
        resource: "order",
        action: "view_all",
      },
    });
    if (!canViewAll && order.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.post(
  "/api/orders/create",
  requireAuth,
  requirePermission("order", "create"),
  async (req, res) => {
    try {
      const schema = z.object({
        type: z.enum(["income", "expense"]),
        description: z.string().optional(),
        items: z
          .array(
            z.object({
              description: z.string().min(1),
              quantity: z.number().int().positive(),
              unitPrice: z.number().positive(),
              categoryId: z.number().int().optional(),
            }),
          )
          .min(1),
      });

      const data = schema.parse(req.body);
      const totalAmount = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      const newOrder = await prisma.$transaction(async (tx) => {
        const orderNumber = generateOrderNumber();

        const order = await tx.order.create({
          data: {
            orderNumber,
            type: data.type,
            status: "pending",
            totalAmount,
            description: data.description,
            userId: req.user.id,
          },
        });

        await tx.orderItem.createMany({
          data: data.items.map((item) => ({
            orderId: order.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            categoryId: item.categoryId || null,
          })),
        });

        return order;
      });

      await createAuditLog(
        req.user.id,
        "CREATE_ORDER",
        "Order",
        newOrder.id,
        { orderNumber: newOrder.orderNumber, totalAmount },
        req,
        newOrder.id,
      );

      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Create order error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  },
);

app.post(
  "/api/orders/:id/approve",
  requireAuth,
  requirePermission("order", "approve"),
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status !== "pending") {
        return res.status(400).json({ error: "Order is not pending" });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "approved",
          approvedById: req.user.id,
        },
      });

      await createAuditLog(
        req.user.id,
        "APPROVE_ORDER",
        "Order",
        orderId,
        { orderNumber: order.orderNumber },
        req,
        orderId,
      );

      res.json(updatedOrder);
    } catch (error) {
      console.error("Approve order error:", error);
      res.status(500).json({ error: "Failed to approve order" });
    }
  },
);

app.post(
  "/api/orders/:id/execute",
  requireAuth,
  requirePermission("order", "execute"),
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new Error("Order not found");
        if (order.status !== "approved")
          throw new Error("Order must be approved first");

        const fund = await tx.fund.findUnique({ where: { id: 1 } });
        if (!fund) throw new Error("Fund not found");

        let newBalance;
        if (order.type === "income") {
          newBalance = fund.currentBalance + order.totalAmount;
        } else {
          if (fund.currentBalance < order.totalAmount) {
            throw new Error(
              `Insufficient balance: ${fund.currentBalance} < ${order.totalAmount}`,
            );
          }
          newBalance = fund.currentBalance - order.totalAmount;
        }

        const updatedFund = await tx.fund.update({
          where: { id: 1 },
          data: { currentBalance: newBalance },
        });

        const signedAmount =
          order.type === "income" ? order.totalAmount : -order.totalAmount;
        const transaction = await tx.transaction.create({
          data: {
            orderId: order.id,
            fundId: fund.id,
            amount: signedAmount,
            balanceBefore: fund.currentBalance,
            balanceAfter: newBalance,
            description: order.description || order.orderNumber,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "executed",
            executedById: req.user.id,
            executedAt: new Date(),
          },
        });

        return { order: updatedOrder, transaction, fund: updatedFund };
      });

      await createAuditLog(
        req.user.id,
        "EXECUTE_ORDER",
        "Order",
        orderId,
        {
          orderNumber: result.order.orderNumber,
          amount: result.order.totalAmount,
          balanceAfter: result.fund.currentBalance,
        },
        req,
        orderId,
      );

      res.json({
        message: "Order executed successfully",
        order: result.order,
        transaction: result.transaction,
        fund: result.fund,
      });
    } catch (error) {
      console.error("Execute order error:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to execute order" });
    }
  },
);

// ============ DOCUMENTS (LOCAL STORAGE) ============
app.post(
  "/api/documents/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const { orderId } = req.body;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "No file uploaded" });
      if (!orderId) return res.status(400).json({ error: "Order ID required" });

      const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
      });
      if (!order) return res.status(404).json({ error: "Order not found" });

      const canViewAll = await prisma.permission.findFirst({
        where: {
          roleId: req.user.roleId,
          resource: "order",
          action: "view_all",
        },
      });
      if (!canViewAll && order.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const fileUrl = `/uploads/${file.filename}`;

      const document = await prisma.document.create({
        data: {
          orderId: parseInt(orderId),
          fileName: file.originalname,
          fileUrl: fileUrl,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedById: req.user.id,
        },
      });

      await createAuditLog(
        req.user.id,
        "UPLOAD_DOCUMENT",
        "Document",
        document.id,
        { fileName: file.originalname, orderId },
        req,
        parseInt(orderId),
      );

      res.status(201).json(document);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  },
);

// ============ FUND ============
app.get("/api/fund", requireAuth, async (req, res) => {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: 1 },
    });
    if (!fund) return res.status(404).json({ error: "Fund not found" });
    res.json(fund);
  } catch (error) {
    console.error("Get fund error:", error);
    res.status(500).json({ error: "Failed to fetch fund" });
  }
});

// ============ AUDIT LOGS ============
app.get(
  "/api/audit-logs",
  requireAuth,
  requirePermission("audit", "view"),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0, action, userId } = req.query;

      const where = {};
      if (action) where.action = action;
      if (userId) where.userId = parseInt(userId);

      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.auditLog.count({ where });

      res.json({
        data: logs,
        pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
      });
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  },
);

// ============ SETTINGS ============
app.get(
  "/api/settings",
  requireAuth,
  requirePermission("setting", "manage"),
  async (req, res) => {
    try {
      const settings = await prisma.setting.findMany({
        orderBy: { group: "asc" },
      });
      res.json(settings);
    } catch (error) {
      console.error("Get settings error:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  },
);

app.put(
  "/api/settings",
  requireAuth,
  requirePermission("setting", "manage"),
  async (req, res) => {
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
          prisma.setting.update({
            where: { key: item.key },
            data: { value: item.value },
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
  },
);
// ============ DASHBOARD STATS ============
app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    let where = {};

    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: user.roleId,
        resource: "order",
        action: "view_all",
      },
    });
    if (!canViewAll) {
      where.userId = user.id;
    }

    const canViewFund = await prisma.permission.findFirst({
      where: {
        roleId: user.roleId,
        resource: "fund",
        action: "view",
      },
    });

    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      executedOrders,
      fund,
      monthlyTransactions,
    ] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: "pending" } }),
      prisma.order.count({ where: { ...where, status: "approved" } }),
      prisma.order.count({ where: { ...where, status: "executed" } }),
      canViewFund
        ? prisma.fund.findUnique({ where: { id: 1 } })
        : Promise.resolve(null),
      canViewFund
        ? prisma.transaction.aggregate({
            where: {
              createdAt: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: 0 } }),
    ]);

    const recentOrders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { fullName: true, email: true } },
        items: { include: { category: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        approvedOrders,
        executedOrders,
        ...(canViewFund && {
          fundBalance: fund?.currentBalance || 0,
          monthlyTotal: monthlyTransactions._sum.amount || 0,
        }),
      },
      recentOrders,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// ============ REJECT ORDER ============
app.post(
  "/api/orders/:id/reject",
  requireAuth,
  requirePermission("order", "approve"),
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { reason } = req.body;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== "pending" && order.status !== "approved") {
        return res
          .status(400)
          .json({ error: "Only pending or approved orders can be rejected" });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "rejected",
          approvedById: req.user.id,
          notes: reason || "Order rejected",
        },
      });

      await createAuditLog(
        req.user.id,
        "REJECT_ORDER",
        "Order",
        orderId,
        { orderNumber: order.orderNumber, reason },
        req,
        orderId,
      );

      res.json({ message: "Order rejected", order: updatedOrder });
    } catch (error) {
      console.error("Reject order error:", error);
      res.status(500).json({ error: "Failed to reject order" });
    }
  },
);

// ============ CANCEL ORDER ============
app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "executed") {
      return res.status(400).json({
        error: "Cannot cancel an executed order. Contact an administrator.",
      });
    }

    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.permissions.some(
      (p) => p.resource === "order" && p.action === "approve",
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "You can only cancel your own orders",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });

    await createAuditLog(
      req.user.id,
      "CANCEL_ORDER",
      "Order",
      orderId,
      { orderNumber: order.orderNumber },
      req,
      orderId,
    );

    res.json({ message: "Order cancelled", order: updatedOrder });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ error: "Failed to cancel order" });
  }
});

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
