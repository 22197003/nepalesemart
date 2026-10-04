export type TaxSettings = {
  enabled: boolean;
  ratePercent: number;
  pricesIncludeTax: boolean;
  label: string;
};
export const defaultTax: TaxSettings = {
  enabled: true,
  ratePercent: 10,
  pricesIncludeTax: true,
  label: "GST",
};

/** GST component of an amount. Inclusive: amount*r/(1+r). Exclusive: amount*r. */
export function taxOn(amountCents: number, s: TaxSettings): number {
  if (!s.enabled || amountCents <= 0) return 0;
  const r = s.ratePercent / 100;
  return Math.round(
    s.pricesIncludeTax ? (amountCents * r) / (1 + r) : amountCents * r,
  );
}
