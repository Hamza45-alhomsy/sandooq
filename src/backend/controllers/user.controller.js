// controllers/user.controller.js — User management business logic
import { z } from "zod";
import { auth } from "../config/firebase.js";
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const getAllUsers = async (req, res) => {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: getWorkspaceId(req) },
      include: { user: true, role: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(members.map(({ user, role }) => ({ ...user, role })));
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const createUser = async (req, res) => {
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

    await prisma.workspaceMember.create({
      data: {
        workspaceId: getWorkspaceId(req),
        userId: user.id,
        roleId: data.roleId,
      },
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
};

export const updateUserProfile = async (req, res) => {
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
};

export const updateUserRole = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleId } = req.body;

    // Validate roleId
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      return res.status(400).json({ error: "Invalid role ID" });
    }

    // Check if user exists
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: getWorkspaceId(req), userId },
      },
      include: { user: true },
    });
    if (!membership) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = membership.user;

    // Prevent admin from downgrading themselves (optional safety)
    if (user.id === req.user.id) {
      return res.status(403).json({
        error: "You cannot change your own role",
      });
    }

    // Update user role
    const updatedMembership = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId: getWorkspaceId(req), userId },
      },
      data: { roleId },
      include: { user: true, role: true },
    });

    await createAuditLog(
      req.user.id,
      "UPDATE_USER_ROLE",
      "User",
      userId,
      { oldRoleId: user.roleId, newRoleId: roleId },
      req,
    );

    res.json({
      message: "User role updated successfully",
      user: {
        id: updatedMembership.user.id,
        email: updatedMembership.user.email,
        fullName: updatedMembership.user.fullName,
        role: updatedMembership.role.name,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
};
