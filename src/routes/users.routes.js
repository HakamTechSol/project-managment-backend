import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";
import { uploadSingle } from "../middleware/upload.js";

const router = express.Router();

router.use(requireAuth);

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err && err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next(err);
};

// ADMIN & SUPER_ADMIN
router.get("/get", requirePermission("users.view"), getUsers);
router.get("/:id", requirePermission("users.view"), getUserById);
router.post("/add", requirePermission("users.create"), createUser);
router.put("/:id", requirePermission("users.update"), uploadSingle, handleMulterError, updateUser);
router.delete("/:id", requirePermission("users.delete"), deleteUser);

export default router;
