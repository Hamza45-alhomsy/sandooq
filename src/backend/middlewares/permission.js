// middlewares/permission.js — Permission check middleware
import prisma from "../config/database.js";

export const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userPermissions = req.user?.permissions || [];
      const hasExplicitPermission = userPermissions.includes(
        `${resource}:${action}`,
      );
      const isAdmin =
        req.user?.role === "admin" || req.user?.role?.name === "admin";

      if (isAdmin || hasExplicitPermission) {
        return next();
      }

      const permission = await prisma.permission.findFirst({
        where: {
          roleId: req.user.roleId,
          resource: resource,
          action: action,
        },
      });

      if (!permission) {
        return res
          .status(403)
          .json({ error: `Missing permission: ${resource}:${action}` });
      }
      next();
    } catch (error) {
      console.error("Permission error:", error);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};
