import { z } from "zod";
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { getWorkspaceId } from "../utils/workspace.js";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  nameAr: z.string().trim().optional().or(z.literal("")),
  type: z.enum(["income", "expense"]),
  description: z.string().trim().max(255).optional().or(z.literal("")),
});

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { workspaceId: getWorkspaceId(req) },
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

export const createCategory = async (req, res) => {
  try {
    const data = categorySchema.parse(req.body);
    const normalizedName = data.name.trim();

    const existingCategory = await prisma.category.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: getWorkspaceId(req),
          name: normalizedName,
        },
      },
    });

    if (existingCategory) {
      return res.status(409).json({ error: "Category already exists" });
    }

    const category = await prisma.category.create({
      data: {
        name: normalizedName,
        nameAr: data.nameAr ? data.nameAr.trim() : null,
        type: data.type,
        workspaceId: getWorkspaceId(req),
        description: data.description ? data.description.trim() : null,
      },
    });

    await createAuditLog(
      req.user.id,
      "CREATE_CATEGORY",
      "Category",
      category.id,
      { name: category.name, type: category.type },
      req,
      category.id,
    );

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const data = categorySchema.parse(req.body);
    const normalizedName = data.name.trim();

    const existingCategory = await prisma.category.findFirst({
      where: { id: categoryId, workspaceId: getWorkspaceId(req) },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    const duplicateCategory = await prisma.category.findUnique({
      where: {
        workspaceId_name: {
          workspaceId: getWorkspaceId(req),
          name: normalizedName,
        },
      },
    });

    if (duplicateCategory && duplicateCategory.id !== categoryId) {
      return res.status(409).json({ error: "Category name already exists" });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: normalizedName,
        nameAr: data.nameAr ? data.nameAr.trim() : null,
        type: data.type,
        workspaceId: getWorkspaceId(req),
        description: data.description ? data.description.trim() : null,
      },
    });

    await createAuditLog(
      req.user.id,
      "UPDATE_CATEGORY",
      "Category",
      category.id,
      { name: category.name, type: category.type },
      req,
      category.id,
    );

    res.json(category);
  } catch (error) {
    console.error("Update category error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Failed to update category" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const existingCategory = await prisma.category.findFirst({
      where: { id: categoryId, workspaceId: getWorkspaceId(req) },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    const usedInTransactionItem = await prisma.transactionItem.findFirst({
      where: {
        categoryId: categoryId,
        transaction: { workspaceId: getWorkspaceId(req) },
      },
    });

    if (usedInTransactionItem) {
      return res.status(400).json({
        error:
          "This category is used by existing transactions and cannot be deleted.",
      });
    }

    await prisma.category.delete({ where: { id: categoryId } });

    await createAuditLog(
      req.user.id,
      "DELETE_CATEGORY",
      "Category",
      categoryId,
      { name: existingCategory.name },
      req,
      categoryId,
    );

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
