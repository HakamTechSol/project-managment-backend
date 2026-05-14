import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  getLeads,
  createLead,
  updateLead,
  importLeads,
  deleteLead,
} from "../controllers/leads.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

router.get("/", getLeads);
router.post("/", createLead);
router.put("/:leadId", updateLead);
router.post("/import", upload.single("file"), importLeads);
router.delete("/:leadId", deleteLead);

export default router;
