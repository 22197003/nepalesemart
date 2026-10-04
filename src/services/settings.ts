import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { brandDefaults, type Brand } from "@/config/brand";
import { defaultTax, type TaxSettings } from "@/lib/tax";

async function getSetting<T extends object>(
  key: string,
  fallback: T,
  client: Prisma.TransactionClient = db,
): Promise<T> {
  const row = await client.siteSetting.findUnique({ where: { key } });
  return { ...fallback, ...((row?.value as Partial<T> | undefined) ?? {}) };
}
export const getBrand = (client: Prisma.TransactionClient = db) =>
  getSetting<Brand>("brand", brandDefaults, client);
export const getTaxSettings = (client: Prisma.TransactionClient = db) =>
  getSetting<TaxSettings>("tax", defaultTax, client);
