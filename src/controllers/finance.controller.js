import { pool } from "../../config/db.js";

const normalizeRange = (range = "month") => {
  const daysMap = { month: 30, quarter: 90, year: 365 };
  return daysMap[range] || 30;
};

const toNumber = (value) => Number(value || 0);

export const getFinanceStats = async (req, res) => {
  try {
    const days = normalizeRange(req.query.range);

    const [[revenue]] = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status = 'completed'
      `,
      [days]
    );

    const [[expenses]] = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      `,
      [days]
    );

    const [[outstanding]] = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE status = 'pending'
      `
    );

    const [settingsRows] = await pool.query(
      `
      SELECT setting_key, setting_value
      FROM finance_settings
      WHERE setting_key IN ('future_fund_percentage', 'commission_percentage')
      `
    );

    const settings = Object.fromEntries(
      settingsRows.map((row) => [row.setting_key, toNumber(row.setting_value)])
    );

    const revenueAmount = toNumber(revenue.total);
    const expensesAmount = toNumber(expenses.total);
    const netProfit = revenueAmount - expensesAmount;
    const futureFundPct = settings.future_fund_percentage || 20;
    const commissionPct = settings.commission_percentage || 15;
    const distributablePct = 100 - futureFundPct - commissionPct;

    res.json({
      success: true,
      data: {
        revenue: revenueAmount,
        expenses: expensesAmount,
        netProfit,
        outstanding: toNumber(outstanding.total),
        distribution: [
          { label: "Future Fund", percentage: futureFundPct, amount: netProfit * (futureFundPct / 100) },
          { label: "Commission", percentage: commissionPct, amount: netProfit * (commissionPct / 100) },
          { label: "Distributable", percentage: distributablePct, amount: netProfit * (distributablePct / 100) },
        ],
      },
    });
  } catch (error) {
    console.error("Finance stats error:", error);
    res.json({ success: true, data: { revenue: 0, expenses: 0, netProfit: 0, outstanding: 0, distribution: [] } });
  }
};

export const getFinanceChart = async (req, res) => {
  try {
    const days = normalizeRange(req.query.range);
    const [revenueRows] = await pool.query(
      `
      SELECT DATE(created_at) AS date, COALESCE(SUM(amount), 0) AS revenue
      FROM payments
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
      `,
      [days]
    );

    const [expenseRows] = await pool.query(
      `
      SELECT DATE(expense_date) AS date, COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE expense_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(expense_date)
      ORDER BY DATE(expense_date)
      `,
      [days]
    );

    const merged = new Map();
    for (const row of revenueRows) {
      const key = row.date?.toISOString?.().slice(0, 10) || String(row.date);
      merged.set(key, { date: key, revenue: toNumber(row.revenue), expenses: 0 });
    }
    for (const row of expenseRows) {
      const key = row.date?.toISOString?.().slice(0, 10) || String(row.date);
      const existing = merged.get(key) || { date: key, revenue: 0, expenses: 0 };
      existing.expenses = toNumber(row.expenses);
      merged.set(key, existing);
    }

    res.json({ success: true, data: [...merged.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 30) });
  } catch (error) {
    console.error("Finance chart error:", error);
    res.json({ success: true, data: [] });
  }
};

export const getPayments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM payments
      ORDER BY created_at DESC, id DESC
      `
    );
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

export const createPayment = async (req, res) => {
  try {
    const {
      company_id = 1,
      invoice_id = null,
      amount,
      currency = "USD",
      payment_method = "bank_transfer",
      status = "completed",
      client_name,
      payment_date,
      description,
    } = req.body;

    const meta = JSON.stringify({
      client_name: client_name || null,
      payment_date: payment_date || null,
      description: description || "",
      created_by: req.user.id,
    });

    const [result] = await pool.query(
      `
      INSERT INTO payments
      (company_id, invoice_id, amount, currency, payment_method, status, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
      `,
      [company_id, invoice_id, amount, currency, payment_method, status, meta, payment_date]
    );

    res.json({ success: true, message: "Payment added", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ success: false, message: "Failed to add payment" });
  }
};

export const deletePayment = async (req, res) => {
  try {
    await pool.query("DELETE FROM payments WHERE id = ?", [req.params.paymentId]);
    res.json({ success: true, message: "Payment deleted" });
  } catch (error) {
    console.error("Delete payment error:", error);
    res.status(500).json({ success: false, message: "Failed to delete payment" });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM expenses ORDER BY expense_date DESC, id DESC");
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get expenses error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch expenses" });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { category, description, amount, expense_date, payment_method = "bank_transfer" } = req.body;
    const [result] = await pool.query(
      `
      INSERT INTO expenses (category, description, amount, expense_date, payment_method, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [category, description || "", amount, expense_date, payment_method, req.user.id]
    );
    res.json({ success: true, message: "Expense added", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create expense error:", error);
    res.status(500).json({ success: false, message: "Failed to add expense" });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.expenseId]);
    res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ success: false, message: "Failed to delete expense" });
  }
};

export const getClients = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clients ORDER BY name ASC");
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get clients error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch clients" });
  }
};

export const createClient = async (req, res) => {
  try {
    const { name, email, phone, company = "", address = "" } = req.body;
    const [result] = await pool.query(
      `
      INSERT INTO clients (name, email, phone, company, address, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'active', NOW())
      `,
      [name, email, phone, company, address]
    );
    res.json({ success: true, message: "Client added", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ success: false, message: "Failed to add client" });
  }
};

export const deleteClient = async (req, res) => {
  try {
    await pool.query("DELETE FROM clients WHERE id = ?", [req.params.clientId]);
    res.json({ success: true, message: "Client deleted" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ success: false, message: "Failed to delete client" });
  }
};

export const getFounders = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM founders ORDER BY id ASC");
    res.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("Get founders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch founders" });
  }
};

export const createFounder = async (req, res) => {
  try {
    const { name, role, equity_percentage, join_date, email, phone } = req.body;
    const [result] = await pool.query(
      `
      INSERT INTO founders (name, role, equity_percentage, join_date, email, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      `,
      [name, role, equity_percentage, join_date || null, email, phone]
    );
    res.json({ success: true, message: "Founder added", data: { id: result.insertId } });
  } catch (error) {
    console.error("Create founder error:", error);
    res.status(500).json({ success: false, message: "Failed to add founder" });
  }
};

export const deleteFounder = async (req, res) => {
  try {
    await pool.query("DELETE FROM founders WHERE id = ?", [req.params.founderId]);
    res.json({ success: true, message: "Founder deleted" });
  } catch (error) {
    console.error("Delete founder error:", error);
    res.status(500).json({ success: false, message: "Failed to delete founder" });
  }
};

export const getFounderEquityTotal = async (req, res) => {
  try {
    const [[row]] = await pool.query("SELECT COALESCE(SUM(equity_percentage), 0) AS total FROM founders");
    res.json({ success: true, data: { total: toNumber(row.total) } });
  } catch (error) {
    console.error("Equity total error:", error);
    res.json({ success: true, data: { total: 0 } });
  }
};

export const getFinanceSettings = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT setting_key, setting_value FROM finance_settings");
    res.json({ success: true, data: Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])) });
  } catch (error) {
    console.error("Get finance settings error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch settings" });
  }
};

export const updateFinanceSettings = async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body || {})) {
      await pool.query(
        `
        INSERT INTO finance_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `,
        [key, String(value)]
      );
    }
    res.json({ success: true, message: "Settings updated" });
  } catch (error) {
    console.error("Update finance settings error:", error);
    res.status(500).json({ success: false, message: "Failed to update settings" });
  }
};
