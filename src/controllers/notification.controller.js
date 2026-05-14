import { pool } from "../../config/db.js";


/**
 * GET NOTIFICATIONS
 * GET /notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id; 

    let query = `
      SELECT 
        n.*,
        u.name,
        u.email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
    `;
    let params = [];

    // ✅ Super Admin (role_id = 1) → sab dekhega
    if (roleId === 1) {
      query += ` ORDER BY n.created_at DESC LIMIT 50`;
    } 
    // ✅ Normal users - get broadcast notifications and their specific notifications
    else {
      query += `
        WHERE 
          (
            n.user_id = ? 
            OR n.user_id IS NULL
          )
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [userId];
    }

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load notifications",
    });
  }
};

export const getNotificationSettings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT user_id, email_tasks, email_projects, email_mentions, browser_notifications
      FROM user_notification_settings
      WHERE user_id = ?
      `,
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({
        success: true,
        data: {
          email_tasks: 1,
          email_projects: 1,
          email_mentions: 1,
          browser_notifications: 0,
        },
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Get notification settings error:", err);
    res.status(500).json({ success: false, message: "Failed to load settings" });
  }
};

export const updateNotificationSettings = async (req, res) => {
  try {
    const {
      email_tasks = 1,
      email_projects = 1,
      email_mentions = 1,
      browser_notifications = 0,
    } = req.body || {};

    await pool.query(
      `
      INSERT INTO user_notification_settings
      (user_id, email_tasks, email_projects, email_mentions, browser_notifications)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        email_tasks = VALUES(email_tasks),
        email_projects = VALUES(email_projects),
        email_mentions = VALUES(email_mentions),
        browser_notifications = VALUES(browser_notifications)
      `,
      [req.user.id, email_tasks ? 1 : 0, email_projects ? 1 : 0, email_mentions ? 1 : 0, browser_notifications ? 1 : 0]
    );

    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    console.error("Update notification settings error:", err);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};


/**
 * MARK NOTIFICATION READ
 * PUT /notifications/:id/read
 */
export const markNotificationRead = async (req, res) => {
  const { id } = req.params;

  await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [id]
  );

  res.json({ success: true });
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL`,
      [req.user.id]
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ success: false, message: "Failed to update notifications" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = ? AND (user_id = ? OR user_id IS NULL)`,
      [req.params.id, req.user.id]
    );

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ success: false, message: "Failed to delete notification" });
  }
};
