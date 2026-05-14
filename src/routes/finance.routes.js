import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getFinanceStats,
  getFinanceChart,
  getPayments,
  createPayment,
  deletePayment,
  getExpenses,
  createExpense,
  deleteExpense,
  getClients,
  createClient,
  deleteClient,
  getFounders,
  createFounder,
  deleteFounder,
  getFounderEquityTotal,
  getFinanceSettings,
  updateFinanceSettings,
} from "../controllers/finance.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/stats", getFinanceStats);
router.get("/chart", getFinanceChart);
router.get("/payments", getPayments);
router.post("/payments", createPayment);
router.delete("/payments/:paymentId", deletePayment);
router.get("/expenses", getExpenses);
router.post("/expenses", createExpense);
router.delete("/expenses/:expenseId", deleteExpense);
router.get("/clients", getClients);
router.post("/clients", createClient);
router.delete("/clients/:clientId", deleteClient);
router.get("/founders", getFounders);
router.post("/founders", createFounder);
router.delete("/founders/:founderId", deleteFounder);
router.get("/founders/equity-total", getFounderEquityTotal);
router.get("/settings", getFinanceSettings);
router.post("/settings", updateFinanceSettings);

export default router;
