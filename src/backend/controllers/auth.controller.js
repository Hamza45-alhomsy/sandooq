// controllers/auth.controller.js — Authentication business logic
import { z } from "zod";
import { auth } from "../config/firebase.js";
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { ensureWorkspace } from "../utils/workspace.js";

export const debugVerify = async (req, res) => {
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
};

export const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const decodedToken = await auth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email || "";
    console.log(
      "📩 Token received:",
      token ? token.slice(0, 20) + "..." : "No token",
    );

    // 1. Find existing user by UID
    let user = await prisma.user.findUnique({
      where: { uid: firebaseUid },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    // 2. If not found by UID, try to find by email (for linking)
    if (!user && email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: email },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (existingUserByEmail) {
        // Link the existing user to the new Firebase UID
        console.log(
          `Linking existing user (${email}) to new UID: ${firebaseUid}`,
        );
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            uid: firebaseUid,
            fullName: decodedToken.name || existingUserByEmail.fullName,
            isActive: true,
          },
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        });
        // Log the linking event
        await createAuditLog(
          user.id,
          "LINK_ACCOUNT",
          "User",
          user.id,
          { email: user.email, provider: "google" },
          req,
        );
      }
    }

    // 3. If still no user, create a new one
    if (!user) {
      console.log(`Auto‑creating user for UID: ${firebaseUid}`);

      const defaultRole = await prisma.role.findUnique({
        where: { name: "client" },
      });
      const roleId = defaultRole?.id || 3; // fallback to 3

      const displayName =
        decodedToken.name || decodedToken.email?.split("@")[0] || "New User";

      user = await prisma.user.create({
        data: {
          uid: firebaseUid,
          email: email,
          fullName: displayName,
          roleId: roleId,
          phone: null,
          isActive: true,
        },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      // Log the registration
      await createAuditLog(
        user.id,
        "REGISTER",
        "User",
        user.id,
        { email: user.email, provider: "google" },
        req,
      );
    }

    // 4. Check active status
    if (!user.isActive) {
      return res.status(403).json({
        error: "Account deactivated.",
        exists: true,
        isActive: false,
      });
    }

    const membership = await ensureWorkspace(user.id, user.fullName);
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    // 5. Log login
    await createAuditLog(
      user.id,
      "LOGIN",
      "User",
      user.id,
      { email: user.email },
      req,
    );

    // 6. Return user data
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
        workspace: {
          id: membership.workspace.id,
          name: membership.workspace.name,
          role: membership.role.name,
        },
        workspaces: memberships.map((item) => ({
          id: item.workspace.id,
          name: item.workspace.name,
          role: item.role.name,
        })),
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

export const registerUser = async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      phone: z.string().optional(),
      companyName: z.string().trim().min(1).optional(),
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

    await ensureWorkspace(user.id, data.companyName || data.fullName);

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
};
