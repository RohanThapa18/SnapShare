import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().max(2000).optional(),
    date: z.coerce.date(),
    location: z.string().trim().max(200).optional(),
    expiryDate: z.coerce.date(),
  }),
});

export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(2000).optional(),
    date: z.coerce.date().optional(),
    location: z.string().trim().max(200).optional(),
    expiryDate: z.coerce.date().optional(),
  }),
});

export const joinEventSchema = z.object({
  body: z
    .object({
      passcode: z.string().trim().min(4).max(20).optional(),
      joinToken: z.string().trim().min(10).optional(),
    })
    .refine((data) => data.passcode || data.joinToken, {
      message: "Either passcode or joinToken is required",
    }),
});

export const joinAsPhotographerSchema = z.object({
  body: z.object({
    photographerToken: z.string().trim().min(10),
  }),
});
