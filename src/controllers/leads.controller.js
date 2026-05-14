import ExcelJS from "exceljs";
import { pool } from "../../config/db.js";

const normalizeLeadStatus = (status = "new") => {
  const value = String(status || "new").trim().toLowerCase();
  return ["new", "contacted", "qualified", "converted", "lost"].includes(value) ? value : "new";
};

const normalizeLeadSource = (source = "other") => {
  const value = String(source || "other").trim().toLowerCase();
  return ["website", "referral", "social", "cold_call", "other"].includes(value) ? value : "other";
};

const parseBool = (value) => {
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "y", "completed", "done"].includes(String(value || "").trim().toLowerCase());
};

const parseCsvBuffer = (buffer) => {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((item) => item.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
};

const parseSpreadsheetBuffer = async (buffer, filename = "") => {
  if (filename.toLowerCase().endsWith(".csv")) {
    return parseCsvBuffer(buffer);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_"));

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row.getCell(index + 1).text?.trim?.() ?? "";
    });
    rows.push(record);
  });
  return rows;
};

export const getLeads = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT l.*, u.name AS assigned_to_name
      FROM leads l
      LEFT JOIN users u ON u.id = l.assigned_to
      ORDER BY l.created_at DESC
      `
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch leads" });
  }
};

export const createLead = async (req, res) => {
  try {
    const status = normalizeLeadStatus(req.body.status);
    const [result] = await pool.query(
      `
      INSERT INTO leads (name, email, phone, company, status, source, value, notes, assigned_to, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        req.body.name,
        req.body.email,
        req.body.phone,
        req.body.company,
        status,
        normalizeLeadSource(req.body.source || "website"),
        Number(req.body.value || 0),
        req.body.notes || "",
        req.body.assigned_to || req.user.id,
      ]
    );

    if (status === "converted") {
      await pool.query("UPDATE leads SET converted_at = NOW(), updated_at = NOW() WHERE id = ?", [result.insertId]);
    }

    res.json({ success: true, message: "Lead added", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create lead error:", error);
    res.status(500).json({ success: false, message: "Failed to add lead" });
  }
};

export const updateLead = async (req, res) => {
  try {
    let status = normalizeLeadStatus(req.body.status);
    const completed = parseBool(req.body.completed);
    if (completed && ["new", "contacted", "qualified"].includes(status)) {
      status = "converted";
    } else if (!completed && ["converted", "lost"].includes(status)) {
      status = "qualified";
    }

    await pool.query(
      `
      UPDATE leads
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          company = COALESCE(?, company),
          status = ?,
          source = COALESCE(?, source),
          value = COALESCE(?, value),
          notes = COALESCE(?, notes),
          assigned_to = COALESCE(?, assigned_to),
          converted_at = CASE WHEN ? = 'converted' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        req.body.name,
        req.body.email,
        req.body.phone,
        req.body.company,
        status,
        req.body.source ? normalizeLeadSource(req.body.source) : null,
        req.body.value,
        req.body.notes,
        req.body.assigned_to,
        status,
        req.params.leadId,
      ]
    );

    res.json({ success: true, message: "Lead updated successfully" });
  } catch (error) {
    console.error("Update lead error:", error);
    res.status(500).json({ success: false, message: "Failed to update lead" });
  }
};

export const importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const rows = await parseSpreadsheetBuffer(req.file.buffer, req.file.originalname);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Uploaded file is empty" });
    }

    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      try {
        const name = String(row.name || "").trim();
        const email = String(row.email || "").trim();
        if (!name || !email) {
          skipped += 1;
          continue;
        }

        const [existing] = await pool.query("SELECT id FROM leads WHERE email = ? LIMIT 1", [email]);
        if (existing.length) {
          skipped += 1;
          continue;
        }

        const status = normalizeLeadStatus(row.status);
        const [result] = await pool.query(
          `
          INSERT INTO leads (name, email, phone, company, status, source, value, notes, assigned_to, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `,
          [
            name,
            email,
            row.phone || "",
            row.company || "",
            status,
            normalizeLeadSource(row.source),
            Number(row.value || 0),
            row.notes || "",
            req.user.id,
          ]
        );

        if (parseBool(row.completed) || status === "converted") {
          await pool.query(
            "UPDATE leads SET status = 'converted', converted_at = NOW(), updated_at = NOW() WHERE id = ?",
            [result.insertId]
          );
        }

        inserted += 1;
      } catch (rowError) {
        errors.push(`Row ${index + 2}: ${rowError.message}`);
      }
    }

    res.json({ success: true, message: "Lead import completed", data: { inserted, skipped, errors: errors.slice(0, 10) } });
  } catch (error) {
    console.error("Import leads error:", error);
    res.status(500).json({ success: false, message: "Failed to import leads" });
  }
};

export const deleteLead = async (req, res) => {
  try {
    await pool.query("DELETE FROM leads WHERE id = ?", [req.params.leadId]);
    res.json({ success: true, message: "Lead deleted" });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({ success: false, message: "Failed to delete lead" });
  }
};
