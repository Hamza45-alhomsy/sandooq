// src/backend/controllers/auth.controller.js
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { auth } from "../config/firebase.js";
import { z } from "zod";

export const registerUser = async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      companyName: z.string().trim().min(1).default("My Company"),
    });
    const data = schema.parse(req.body);
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const firebaseUser = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          uid: firebaseUser.uid,
          email: data.email.toLowerCase(),
          fullName: data.fullName,
        },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: data.companyName,
          ownerId: user.id,
          members: { create: { userId: user.id } },
          funds: {
            create: {
              name: "My Fund",
              currency: "SYP",
              userId: user.id,
            },
          },
        },
      });
      return { user, workspace };
    });

    res.status(201).json({
      userId: result.user.id,
      workspaceId: result.workspace.id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ error: "Email already registered" });
    }
    res.status(500).json({ error: "Failed to register user" });
  }
};

export const verifyToken = async (req, res) => {
  try {
    // req.user is attached by requireAuth
    // req.user.workspaceId, req.user.workspace, etc. are attached by ensureWorkspace
    const user = req.user;

    // Log the login
    await createAuditLog(
      user.id,
      "LOGIN",
      "User",
      user.id,
      { email: user.email },
      req,
    );

    // Fetch the user's workspaces (for the sidebar switcher)
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Return user data including workspaces and active workspace ID
    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null,
        isActive: user.isActive,
        workspaces: workspaces.map((workspace) => ({
          ...workspace,
          role: "member",
        })),
        workspaceId: user.workspaceId || null, // ✅ Active workspace
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Authentication service unavailable" });
  }
};
