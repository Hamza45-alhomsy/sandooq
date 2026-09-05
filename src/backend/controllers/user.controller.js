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
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(members.map(({ user }) => user));
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { fullName, phone } = req.body;

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: getWorkspaceId(req), userId },
      },
    });
    if (!targetMembership) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.user.id !== userId) {
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
