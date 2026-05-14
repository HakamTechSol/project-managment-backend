import { pool } from "../../config/db.js";

const isAdminRole = (role = "") => String(role).includes("ADMIN");

export const getTimeLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT tl.*, u.name AS user_name, p.name AS project_name, t.title AS task_title
      FROM time_logs tl
      LEFT JOIN users u ON u.id = tl.user_id
      LEFT JOIN projects p ON p.id = tl.project_id
      LEFT JOIN tasks t ON t.id = tl.task_id
      ORDER BY tl.date DESC, tl.id DESC
      `
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get time logs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch time logs" });
  }
};

export const createTimeLog = async (req, res) => {
  if (isAdminRole(req.user.role)) {
    return res.status(403).json({ success: false, message: "Admins can only view time logs" });
  }

  try {
    const hours = Number(req.body.hours || 0);
    const minutes = Number(req.body.minutes || 0);
    const totalHours = hours + (minutes > 0 ? minutes / 60 : 0);

    const [result] = await pool.query(
      `
      INSERT INTO time_logs (user_id, project_id, task_id, date, hours, minutes, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      `,
      [
        req.user.id,
        req.body.project_id || null,
        req.body.task_id || null,
        req.body.date,
        totalHours,
        minutes,
        req.body.description || "",
      ]
    );

    res.json({ success: true, message: "Time log created successfully", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create time log error:", error);
    res.status(500).json({ success: false, message: "Failed to create time log" });
  }
};

export const getTimeLogsStats = async (req, res) => {
  try {
    const [[today]] = await pool.query("SELECT COALESCE(SUM(hours), 0) AS todays_hours FROM time_logs WHERE date = CURDATE()");
    const [[week]] = await pool.query("SELECT COALESCE(SUM(hours), 0) AS weekly_hours FROM time_logs WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)");
    const [[lastWeek]] = await pool.query(`
      SELECT COALESCE(SUM(hours), 0) AS last_week_hours
      FROM time_logs
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        AND date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);
    const [[productivity]] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'approved' THEN hours ELSE 0 END), 0) AS approved_hours,
        COALESCE(SUM(hours), 0) AS total_hours
      FROM time_logs
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const weeklyHours = Number(week.weekly_hours || 0);
    const lastWeekHours = Number(lastWeek.last_week_hours || 0);
    const productivityPercentage = Number(productivity.total_hours || 0) > 0
      ? (Number(productivity.approved_hours || 0) / Number(productivity.total_hours || 0)) * 100
      : 0;
    const weeklyChangePercentage = lastWeekHours > 0
      ? ((weeklyHours - lastWeekHours) / lastWeekHours) * 100
      : 0;

    res.json({
      success: true,
      data: {
        todays_hours: Number(today.todays_hours || 0),
        weekly_hours: weeklyHours,
        weekly_change_percentage: Number(weeklyChangePercentage.toFixed(1)),
        productivity_percentage: Number(productivityPercentage.toFixed(1)),
      },
    });
  } catch (error) {
    console.error("Time stats error:", error);
    res.json({ success: true, data: { todays_hours: 0, weekly_hours: 0, weekly_change_percentage: 0, productivity_percentage: 0 } });
  }
};

export const deleteTimeLog = async (req, res) => {
  if (isAdminRole(req.user.role)) {
    return res.status(403).json({ success: false, message: "Admins can only view time logs" });
  }

  try {
    await pool.query("DELETE FROM time_logs WHERE id = ?", [req.params.logId]);
    res.json({ success: true, message: "Time log deleted" });
  } catch (error) {
    console.error("Delete time log error:", error);
    res.status(500).json({ success: false, message: "Failed to delete time log" });
  }
};
