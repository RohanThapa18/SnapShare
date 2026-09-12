import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Single unified dashboard for any authenticated user — see
// dashboard.controller.js for why this replaced separate
// organizer/photographer role-gated endpoints.
router.get("/", dashboardController.getMyDashboard);

export default router;
