import { z } from "zod";

export const addPhotographerSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
  }),
});

export const setPermissionSchema = z.object({
  body: z.object({
    canUpload: z.boolean(),
  }),
});