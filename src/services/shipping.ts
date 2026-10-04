import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Zone matching: postcode entries are "3000" or "3000-3999". Postcode match wins over state match. */
function postcodeMatches(entries: string[], postcode: string): boolean {
  const n = Number(postcode);
  return entries.some((e) => {
    const [a, b] = e.split("-").map(Number);
    return b === undefined ? a === n : n >= (a ?? 0) && n <= b;
  });
}

export async function findZone(
  state: string,
  postcode: string,
  client: Prisma.TransactionClient = db,
) {
  const zones = await client.shippingZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return (
    zones.find((z) => postcodeMatches(z.postcodes, postcode)) ??
    zones.find((z) => !z.postcodes.length && z.states.includes(state)) ??
    null
  );
}

export type ShippingQuote = {
  methodCode: string;
  name: string;
  description: string | null;
  priceCents: number;
  isFree: boolean;
  minDays: number | null;
  maxDays: number | null;
  type: "DELIVERY" | "PICKUP";
};

/** All delivery options available for this destination + basket. Rules come from the DB (admin → Delivery). */
export async function quoteShipping(
  args: {
    state?: string;
    postcode?: string;
    subtotalCents: number;
    weightGrams: number;
    shippable: boolean;
  },
  client: Prisma.TransactionClient = db,
): Promise<ShippingQuote[]> {
  const methods = await client.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const zone =
    args.state && args.postcode
      ? await findZone(args.state, args.postcode, client)
      : null;
  const out: ShippingQuote[] = [];
  for (const m of methods) {
    if (m.type === "PICKUP") {
      // pickup is a zone-less method
      out.push({
        methodCode: m.code,
        name: m.name,
        description: m.description,
        priceCents: 0,
        isFree: true,
        minDays: m.minDays,
        maxDays: m.maxDays,
        type: "PICKUP",
      });
      continue;
    }
    if (!zone || !args.shippable) continue;
    const rate = await client.shippingRate.findUnique({
      where: { zoneId_methodId: { zoneId: zone.id, methodId: m.id } },
    });
    if (!rate || !rate.isActive) continue;
    if (rate.minOrderCents != null && args.subtotalCents < rate.minOrderCents)
      continue;
    if (rate.maxWeightGrams != null && args.weightGrams > rate.maxWeightGrams)
      continue;
    const free =
      rate.freeThresholdCents != null &&
      args.subtotalCents >= rate.freeThresholdCents;
    out.push({
      methodCode: m.code,
      name: m.name,
      description: m.description,
      priceCents: free ? 0 : rate.priceCents,
      isFree: free,
      minDays: m.minDays,
      maxDays: m.maxDays,
      type: "DELIVERY",
    });
  }
  return out;
}
