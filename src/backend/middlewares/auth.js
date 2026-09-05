// src/backend/middlewares/auth.js
import prisma from "../config/database.js";
import { auth } from "../config/firebase.js";
import { ensureWorkspace } from "../utils/workspace.js";

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      console.error("Firebase token verification failed:", error);
      return res.status(401).json({ error: "Invalid Firebase token" });
    }
    const firebaseUid = decodedToken.uid;

    const user = await prisma.user.findUnique({
      where: { uid: firebaseUid },
    });

    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.isActive)
      return res.status(403).json({ error: "Account deactivated" });

    req.user = user;
    req.firebaseUid = firebaseUid;

    next();
  } catch (error) {
    console.error("Authentication service error:", error);
    return res
      .status(500)
      .json({ error: "Authentication service unavailable" });
  }
};

export const requireAuth = async (req, res, next) => {
  await authenticateUser(req, res, async () => {
    await ensureWorkspace(req, res, next);
  });
};
