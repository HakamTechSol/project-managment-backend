import express from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectsByUserId
} from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permission.js";

const router = express.Router();

router.use(requireAuth);

// View
router.get("/get",
  requirePermission("projects.view"),
  getProjects);

router.get("/:id",
  requirePermission("projects.view"),
  getProjectById);

// Manage
router.post(
  "/add",
  requirePermission("projects.create"),
  createProject
);

router.put(
  "/:id",
  requirePermission("projects.update"),
  updateProject
);

router.delete(
  "/:id",
  requirePermission("projects.delete"),
  deleteProject
);

// View
router.get("/:userId/projects",
  requirePermission("projects.view"),
  getProjectsByUserId);


export default router;
