import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.query(
      `
      SELECT 
        u.id,
        u.status,
        r.name AS role,
        GROUP_CONCAT(p.name) AS permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ?
      GROUP BY u.id
      `,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    if (rows[0].status !== "active") {
      return res.status(401).json({ message: "User inactive" });
    }

    const role = String(rows[0].role || "").toUpperCase();

    req.user = {
      id: rows[0].id,
      role,
      role_id: role === "SUPER_ADMIN" ? 1 : undefined,
      name: decoded.name,
      email: decoded.email,
      permissions: rows[0].permissions
        ? rows[0].permissions.split(",")
        : [],
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid token" });
    }

    if (["ECONNRESET", "PROTOCOL_CONNECTION_LOST", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"].includes(err.code)) {
      return res.status(503).json({
        message: "Database connection temporarily unavailable",
        code: "DB_UNAVAILABLE",
      });
    }

    res.status(500).json({
      message: "Authentication check failed",
      code: "AUTH_CHECK_FAILED",
    });
  }
};
