import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getTimeLogs,
  createTimeLog,
  getTimeLogsStats,
  deleteTimeLog,
} from "../controllers/timeLogs.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getTimeLogs);
router.post("/", createTimeLog);
router.get("/stats", getTimeLogsStats);
router.delete("/:logId", deleteTimeLog);

export default router;
