// controllers/document.controller.js — Document upload business logic
import prisma from "../config/database.js";
import { createAuditLog } from "../utils/audit.js";
import { getWorkspaceId } from "../utils/workspace.js";

export const uploadDocument = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (!transactionId)
      return res.status(400).json({ error: "Transaction ID required" });

    const transaction = await prisma.transaction.findFirst({
      where: { id: parseInt(transactionId), workspaceId: getWorkspaceId(req) },
    });
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });

    const canViewAll = await prisma.permission.findFirst({
      where: {
        roleId: req.user.roleId,
        resource: "transaction",
        action: "view_all",
      },
    });
    if (!canViewAll && transaction.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const fileUrl = `/uploads/${file.filename}`;

    const document = await prisma.document.create({
      data: {
        transactionId: parseInt(transactionId),
        fileName: file.originalname,
        fileUrl: fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedById: req.user.id,
        workspaceId: getWorkspaceId(req),
      },
    });

    await createAuditLog(
      req.user.id,
      "UPLOAD_DOCUMENT",
      "Document",
      document.id,
      { fileName: file.originalname, transactionId },
      req,
      parseInt(transactionId),
    );

    res.status(201).json(document);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload document" });
  }
};
