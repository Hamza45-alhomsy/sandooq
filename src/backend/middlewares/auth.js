// middlewares/auth.js — Authentication middleware
import { auth } from "../config/firebase.js";
import prisma from "../config/database.js";
import { ensureWorkspace } from "../utils/workspace.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(
      "🔑 Auth header:",
      authHeader ? authHeader.slice(0, 30) + "..." : "No header",
    );

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No Bearer token found");
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("📩 Token from header:", token.slice(0, 20) + "...");

    // ✅ Try to verify the token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
      console.log("✅ Token verified for UID:", decodedToken.uid);
    } catch (verifyError) {
      console.error("❌ Token verification failed:", verifyError.message);
      return res
        .status(401)
        .json({ error: "Invalid token: " + verifyError.message });
    }

    const user = await prisma.user.findUnique({
      where: { uid: decodedToken.uid },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "Account not found or inactive" });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true, role: { include: { permissions: true } } },
      orderBy: { createdAt: "asc" },
    });
    const defaultMembership =
      memberships[0] || (await ensureWorkspace(user.id, user.fullName));
    const requestedWorkspaceId = Number(req.headers["x-workspace-id"]);
    const membership = requestedWorkspaceId
      ? memberships.find((item) => item.workspaceId === requestedWorkspaceId)
      : defaultMembership;

    if (!membership) {
      return res.status(403).json({ error: "Workspace access denied" });
    }

    req.user = {
      ...user,
      workspaceId: membership.workspaceId,
      workspace: membership.workspace,
      memberships,
      roleId: membership.roleId,
      role: membership.role.name,
      permissions: membership.role.permissions.map(
        (permission) => `${permission.resource}:${permission.action}`,
      ),
    };

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};
