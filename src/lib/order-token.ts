import { createHmac, timingSafeEqual } from "node:crypto";
function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET required");
  return s;
}
export const orderToken = (id: string) =>
  createHmac("sha256", key()).update(`order:${id}`).digest("hex");
export function validOrderToken(id: string, token?: string) {
  if (!token) return false;
  const expected = orderToken(id);
  return (
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  );
}
