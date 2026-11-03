import { z } from "zod";
const domain = z
  .string()
  .trim()
  .toLowerCase()
  .max(253)
  .refine(
    (v) =>
      /^(localhost|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/.test(
        v,
      ),
    "Use a hostname without a scheme, path, wildcard, or port.",
  );
export const configSchema = z.object({
  layout: z.enum([
    "grid",
    "masonry",
    "collage",
    "slider",
    "single",
    "vertical",
  ]),
  columns: z.number().int().min(1).max(6),
  mobileColumns: z.number().int().min(1).max(3),
  gap: z.number().int().min(0).max(40),
  radius: z.number().int().min(0).max(32),
  limit: z.number().int().min(1).max(100),
  title: z.string().max(160),
  showProfile: z.boolean(),
  showCaptions: z.boolean(),
  theme: z.enum(["light", "dark"]),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  clickAction: z.enum(["lightbox", "instagram", "none"]),
  mediaFilter: z.enum(["all", "IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
  hiddenPosts: z.array(z.string().max(100)).max(100),
  cardStyle: z.enum(["tile", "classic"]),
});
export const widgetSchema = z.object({
  name: z.string().trim().min(1).max(100),
  config: configSchema,
  domains: z.array(domain).max(30),
});
export const clientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  website: z
    .url()
    .max(500)
    .refine(
      (v) => ["https:", "http:"].includes(new URL(v).protocol),
      "Use an http or https website.",
    ),
  email: z
    .union([z.email(), z.literal("")])
    .optional()
    .default(""),
});
