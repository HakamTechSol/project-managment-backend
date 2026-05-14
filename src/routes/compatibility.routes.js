import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadSingle, upload } from "../middleware/upload.js";
import { login, logout, me } from "../controllers/auth.controller.js";
import { getUsers, createUser, updateUser, deleteUser } from "../controllers/users.controller.js";
import { getProfile, updateProfile, changePassword } from "../controllers/profile.controller.js";
import { getProjects, createProject, updateProject, deleteProject, getProjectById } from "../controllers/projects.controller.js";
import { getProjectMembers, addProjectMember, removeProjectMember } from "../controllers/projectMembers.controller.js";
import { getAllTasks, createTask, updateTask, deleteTask, getTaskById, getTasksByProjectId } from "../controllers/tasks.controller.js";
import { getTaskComments, addTaskComment } from "../controllers/taskComments.controller.js";
import { uploadFile, getFilesByRelatedId, getFileById, deleteFile } from "../controllers/files.controller.js";
import { getInbox, getSentMails, getAllMailsAdmin, sendMail, markAsRead, deleteMail } from "../controllers/mails.controller.js";
import { getRoles, createRole } from "../controllers/roles.controller.js";
import { getRolePermissions, updateRolePermissions } from "../controllers/rolePermissions.controller.js";
import { getPermissions } from "../controllers/permissions.controller.js";
import { getAllActivityLogs } from "../controllers/activityLogs.controller.js";
import { getCalendarByRange } from "../controllers/calendar.controller.js";
import { updateTaskStatus, updateTaskPriority, getMyTasks } from "../controllers/tasks.controller.js";
import { deleteComment } from "../controllers/taskComments.controller.js";

const router = express.Router();

router.post("/auth/login", login);
router.post("/auth/logout", requireAuth, logout);
router.get("/auth/me", requireAuth, me);

router.get("/users/get", requireAuth, getUsers);
router.post("/users/create", requireAuth, createUser);
router.put("/users/update/:id", requireAuth, uploadSingle, updateUser);
router.delete("/users/delete/:id", requireAuth, deleteUser);

router.get("/profile/profile", requireAuth, getProfile);
router.put("/profile/profile", requireAuth, uploadSingle, updateProfile);
router.post("/profile/change-password", requireAuth, changePassword);
router.put("/profile/profile/change-password", requireAuth, changePassword);
router.post("/profile/upload-image", requireAuth, uploadSingle, updateProfile);

router.get("/project/get", requireAuth, getProjects);
router.post("/project/create", requireAuth, createProject);
router.put("/project/update/:id", requireAuth, updateProject);
router.delete("/project/delete/:id", requireAuth, deleteProject);
router.get("/project/:id", requireAuth, getProjectById);
router.post("/project/members/add", requireAuth, (req, res, next) => {
  req.params.id = req.body.project_id || req.body.projectId;
  next();
}, addProjectMember);
router.delete("/project/members/remove/:projectId/:userId", requireAuth, (req, res, next) => {
  req.params.id = req.params.projectId;
  next();
}, removeProjectMember);
router.get("/project/members/:id", requireAuth, getProjectMembers);
router.get("/projects/minimal", requireAuth, async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (payload?.data) {
      return originalJson({
        success: true,
        data: payload.data.map((project) => ({ id: project.id, name: project.name })),
      });
    }
    return originalJson(payload);
  };
  return getProjects(req, res);
});

router.get("/task/get", requireAuth, getAllTasks);
router.get("/task/my", requireAuth, getMyTasks);
router.get("/task/:taskId", requireAuth, (req, res, next) => {
  req.params.id = req.params.taskId;
  next();
}, getTaskById);
router.get("/task/project/:projectId/tasks", requireAuth, getTasksByProjectId);
router.post("/task/create", requireAuth, createTask);
router.put("/task/update/:id", requireAuth, updateTask);
router.delete("/task/delete/:id", requireAuth, deleteTask);
router.patch("/task/:id/status", requireAuth, updateTaskStatus);
router.patch("/task/:id/priority", requireAuth, updateTaskPriority);
router.get("/task/comments/:id", requireAuth, getTaskComments);
router.post("/task/comments/add", requireAuth, (req, res, next) => {
  req.params.id = req.body.task_id || req.body.taskId;
  req.body.content = req.body.content || req.body.comment;
  next();
}, addTaskComment);
router.delete("/task/comments/delete/:id", requireAuth, deleteComment);
router.post("/task/files/upload", requireAuth, upload.single("file"), (req, res, next) => {
  req.body.related_type = req.body.related_type || "TASK";
  req.body.related_id = req.body.related_id || req.body.task_id || req.body.taskId;
  next();
}, uploadFile);
router.get("/task/files/:taskId", requireAuth, (req, res, next) => {
  req.params.related_id = req.params.taskId;
  next();
}, getFilesByRelatedId);
router.get("/task/file/:id", requireAuth, getFileById);
router.delete("/task/files/delete/:id", requireAuth, deleteFile);

router.get("/mails/inbox", requireAuth, getInbox);
router.get("/mails/sent", requireAuth, getSentMails);
router.get("/mails/admin/all", requireAuth, getAllMailsAdmin);
router.post("/mails/send", requireAuth, upload.array("attachments", 10), sendMail);
router.put("/mails/read/:id", requireAuth, markAsRead);
router.delete("/mails/delete/:id", requireAuth, deleteMail);

router.get("/roles/get", requireAuth, getRoles);
router.post("/roles/create", requireAuth, createRole);
router.put("/roles/:roleId/permissions", requireAuth, updateRolePermissions);
router.get("/roles/:roleId/permissions", requireAuth, getRolePermissions);
router.get("/permissions/get", requireAuth, getPermissions);
router.get("/activity-logs/get", requireAuth, getAllActivityLogs);

router.get("/calendar/events", requireAuth, (req, res, next) => {
  req.body = {
    start_date: req.query.start_date || req.query.startDate,
    end_date: req.query.end_date || req.query.endDate,
  };
  next();
}, getCalendarByRange);
router.post("/calendar/events", requireAuth, (req, res, next) => {
  req.body.start_date = req.body.start_date || req.body.startDate;
  req.body.end_date = req.body.end_date || req.body.endDate;
  next();
}, getCalendarByRange);

export default router;
