import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { testDbConnection } from "./config/db.js";
import { initSocket } from "./src/services/socket.service.js";
import { scheduleProjectStartNotifications } from "./src/services/scheduler.service.js";
import { ensureOptionalModuleTables } from "./src/services/bootstrap.service.js";
import authRoutes from "./src/routes/auth.routes.js";
import rolesRoutes from "./src/routes/roles.routes.js";
import permissionsRoutes from "./src/routes/permissions.routes.js";
import userPermissionsRoutes from "./src/routes/rolePermissions.routes.js";
import usersRoutes from "./src/routes/users.routes.js";
import projectsRoutes from "./src/routes/projects.routes.js";
import projectMembersRoutes from "./src/routes/projectMembers.routes.js";
import tasksRoutes from "./src/routes/tasks.routes.js";
import taskCommentsRoutes from "./src/routes/taskComments.routes.js";
import filesRoutes from "./src/routes/files.routes.js";
import reportsRoutes from "./src/routes/reports.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import activityLogsRoutes from "./src/routes/activityLogs.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import calendargRoutes from "./src/routes/calendar.routes.js";
import mailRoutes from "./src/routes/mails.routes.js";
import financeRoutes from "./src/routes/finance.routes.js";
import timeLogsRoutes from "./src/routes/timeLogs.routes.js";
import leadsRoutes from "./src/routes/leads.routes.js";
import compatibilityRoutes from "./src/routes/compatibility.routes.js";


dotenv.config();

const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: [
    "http://localhost:8080",
    "https://zenith-board-hub.lovable.app",
    "https://orbit-grid-suite.lovable.app"
  ],
  credentials: true
}));

app.use(express.json());

// OLD paths (tasks / projects – backward compatibility)
app.use(
  "/api/src/uploads",
  express.static(path.join(__dirname, "src/uploads"))
);

// NEW paths (mails / future)
app.use(
  "/api/uploads",
  express.static(path.join(__dirname, "src/uploads"))
);


// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Optional: DB check route
app.get("/api/db-check", async (req, res) => {
  try {
    await testDbConnection();
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "not-connected" });
  }
});

// Auth routes
app.use("/api/auth", authRoutes);
app.use("/api/role", rolesRoutes);
app.use("/api/permissioins", permissionsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api", userPermissionsRoutes);
app.use("/api", notificationRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/project", projectsRoutes);
app.use("/api/project", projectMembersRoutes);
app.use("/api/task", tasksRoutes);
app.use("/api/taskcomment", taskCommentsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/report", reportsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/activitylog", activityLogsRoutes);
app.use("/api", calendargRoutes);
app.use("/api/mails", mailRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/time-logs", timeLogsRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api", compatibilityRoutes);


const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
// initialize socket.io
initSocket(server);

let dbReady = false;
try {
  await testDbConnection();
  dbReady = true;
} catch {
  console.warn("Skipping DB bootstrap because database is not reachable right now.");
}

if (dbReady) {
  await ensureOptionalModuleTables();
  scheduleProjectStartNotifications();
}

server.listen(PORT, async () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
