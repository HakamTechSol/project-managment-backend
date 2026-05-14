import { pool } from "../../config/db.js";

const safeQuery = async (sql) => {
  try {
    await pool.query(sql);
  } catch (error) {
    console.error("Bootstrap query failed:", error.message);
  }
};

export const ensureOptionalModuleTables = async () => {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS user_notification_settings (
      user_id INT NOT NULL PRIMARY KEY,
      email_tasks TINYINT(1) NOT NULL DEFAULT 1,
      email_projects TINYINT(1) NOT NULL DEFAULT 1,
      email_mentions TINYINT(1) NOT NULL DEFAULT 1,
      browser_notifications TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      category VARCHAR(100) NOT NULL,
      description TEXT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      expense_date DATE NOT NULL,
      payment_method VARCHAR(100) DEFAULT 'bank_transfer',
      created_by INT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NULL,
      phone VARCHAR(50) NULL,
      company VARCHAR(150) NULL,
      address TEXT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS founders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      role VARCHAR(100) NULL,
      equity_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      join_date DATE NULL,
      email VARCHAR(150) NULL,
      phone VARCHAR(50) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS finance_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      project_id INT NULL,
      task_id INT NULL,
      date DATE NOT NULL,
      hours DECIMAL(8,2) NOT NULL DEFAULT 0,
      minutes INT NOT NULL DEFAULT 0,
      description TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS leads (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(150) NOT NULL,
      phone VARCHAR(50) NULL,
      company VARCHAR(150) NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      source VARCHAR(50) NOT NULL DEFAULT 'website',
      value DECIMAL(12,2) NOT NULL DEFAULT 0,
      notes TEXT NULL,
      assigned_to INT NULL,
      converted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};
