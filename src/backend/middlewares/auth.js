// src/backend/middlewares/auth.js
import prisma from "../config/database.js";
import { auth } from "../config/firebase.js";
import { ensureWorkspace } from "../utils/workspace.js";

export const requireAuth = async (req, res, next) => {
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
          include: { permissions: true },
        },
      },
    });

    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.isActive)
      return res.status(403).json({ error: "Account deactivated" });

    req.user = user;
    req.firebaseUid = firebaseUid;

    // ✅ Attach workspace info
    await ensureWorkspace(req, res, next);
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};
