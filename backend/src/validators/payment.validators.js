import { z } from "zod";
import { PURCHASE_TYPE } from "../constants/enums.js";

export const createOrderSchema = z.object({
  body: z.object({
    eventId: z.string().min(1),
    purchaseType: z.enum([PURCHASE_TYPE.PHOTO, PURCHASE_TYPE.ALBUM]),
    photoId: z.string().optional(),
    album: z.enum(["OFFICIAL", "COMMUNITY"]).optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
});
