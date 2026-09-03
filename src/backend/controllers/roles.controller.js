// controllers/roles.controller.js — Role management business logic
import prisma from "../config/database.js";

export const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
    });
    res.json(roles);
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};
