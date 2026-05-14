import express from "express";
import {
  getNotifications,
  markNotificationRead,
  getNotificationSettings,
  updateNotificationSettings,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/notifications", requireAuth, getNotifications);
router.get("/notifications/get", requireAuth, getNotifications);
router.get("/notifications/settings", requireAuth, getNotificationSettings);
router.put("/notifications/settings", requireAuth, updateNotificationSettings);
router.put("/notifications/:id/read", requireAuth, markNotificationRead);
router.put("/notifications/read/:id", requireAuth, markNotificationRead);
router.put("/notifications/read-all", requireAuth, markAllNotificationsRead);
router.delete("/notifications/delete/:id", requireAuth, deleteNotification);

export default router;
