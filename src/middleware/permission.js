export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (["SUPER_ADMIN", "ADMIN"].includes(req.user.role)) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        message: "Permission denied",
      });
    }

    next();
  };
};
