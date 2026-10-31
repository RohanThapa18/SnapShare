import { z } from "zod";
import { PURCHASE_TYPE } from "../constants/enums.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const createOrderSchema = z.object({
  body: z.object({
    eventId: objectId,
    purchaseType: z.enum([PURCHASE_TYPE.PHOTO, PURCHASE_TYPE.ALBUM]),
    photoId: objectId.optional(),
    album: z.enum(["OFFICIAL", "COMMUNITY"]).optional(),
    photographerId: objectId.optional(),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1).max(100),
    razorpay_payment_id: z.string().min(1).max(100),
    razorpay_signature: z.string().min(1).max(200),
  }),
});

export const upiSchema = z.object({
  body: z.object({
    upiId: z.string().trim().regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID"),
  }),
});

export const markPaidSchema = z.object({
  body: z.object({
    reference: z.string().trim().min(3).max(100),
  }),
});