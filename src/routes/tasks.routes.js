import express from "express";
import {
  getAllTasks,
  getMyTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  updateTaskPriority,
  deleteTask,
  getTasksByUserId,
  getTasksByProjectId
} from "../controllers/tasks.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

router.use(requireAuth);

// Admin
router.get("/tasks", requirePermission("tasks.view"), getAllTasks);

// Logged-in user
router.get("/tasks/my", getMyTasks);

// Task detail
router.get("/tasks/:id", requirePermission("tasks.view"), getTaskById);

// Manage tasks
router.post(
  "/tasks",
  requirePermission("tasks.create"),
  createTask
);

router.put(
  "/tasks/:id",
  requirePermission("tasks.update"),
  updateTask
);

router.delete(
  "/tasks/:id",
  requirePermission("tasks.delete"),
  deleteTask
);

// Update task status
router.patch("/tasks/:id/status", requirePermission("tasks.update"), updateTaskStatus);

// Update task priority
router.patch("/tasks/:id/priority", requirePermission("tasks.update"), updateTaskPriority);

// Task detail
router.get("/:userId/tasks", requirePermission("tasks.view"), getTasksByUserId);

router.get(
  "/projects/:projectId/tasks",
  requireAuth,
  getTasksByProjectId
);


export default router;
