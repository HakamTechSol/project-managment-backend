// src/db.js
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT || 3306;
const dbUser = process.env.DB_USER || process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASS ?? process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME || process.env.DB_DATABASE;

export const pool = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 15000,
});

export const testDbConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`MySQL connected successfully (Host: ${dbHost}, DB: ${dbName}, User: ${dbUser})`);
    connection.release();
  } catch (err) {
    console.error("Database connection failed");
    console.error("Error Details:", err.message);

    if (err.code === "ECONNREFUSED") {
      console.log("Hint: Check if DB_HOST should be 'localhost' instead of an IP.");
    }

    throw err;
  }
};
