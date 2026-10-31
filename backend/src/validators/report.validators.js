import { z } from "zod";
import { REPORT_REASON } from "../models/Report.model.js";

export const reportPhotoSchema = z.object({
  body: z.object({
    reason: z.enum(Object.values(REPORT_REASON)),
    note: z.string().trim().max(500).optional(),
  }),
});

export const resolveReportSchema = z.object({
  body: z.object({
    action: z.enum(["remove", "dismiss"]),
  }),
});