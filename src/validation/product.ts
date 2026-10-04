import { z } from "zod";

const cents = z.number().int().min(0).max(10_000_00);

export const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(40),
  name: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(32).optional(),
  priceCents: cents,
  salePriceCents: cents.nullable().optional(),
  weightGrams: z.number().int().min(0).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  stockQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    sku: z.string().trim().min(2).max(40),
    shortDescription: z.string().trim().max(300).optional(),
    description: z.string().trim().max(10_000).optional(),
    status: z.enum(["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"]),
    categoryId: z.string().min(1),
    subcategoryId: z.string().nullable().optional(),
    brandId: z.string().nullable().optional(),
    tags: z.array(z.string().trim().toLowerCase().max(40)).max(30).default([]),
    priceCents: cents,
    salePriceCents: cents.nullable().optional(),
    costPriceCents: cents.nullable().optional(),
    isTaxable: z.boolean().default(true),
    shippingEligible: z.boolean().default(true),
    storageType: z
      .enum(["AMBIENT", "REFRIGERATED", "FROZEN"])
      .default("AMBIENT"),
    ingredients: z.string().max(2000).optional(),
    allergens: z.array(z.string().max(40)).default([]),
    isVegetarian: z.boolean().nullable().optional(),
    isVegan: z.boolean().nullable().optional(),
    isHalal: z.boolean().nullable().optional(),
    isGlutenFree: z.boolean().nullable().optional(),
    spiceLevel: z.number().int().min(0).max(5).nullable().optional(),
    isFeatured: z.boolean().default(false),
    isBestseller: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    variants: z.array(variantSchema).min(1),
  })
  .refine((p) => p.salePriceCents == null || p.salePriceCents < p.priceCents, {
    message: "Sale price must be below price",
    path: ["salePriceCents"],
  });
