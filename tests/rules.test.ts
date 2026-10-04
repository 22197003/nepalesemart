import { describe, it, expect } from "vitest";
import { taxOn, defaultTax } from "../src/lib/tax";
import { can } from "../src/lib/rbac";
import { safeNext } from "../src/lib/forms";
import { checkoutSchema, cartItemSchema } from "../src/validation/checkout";
import { orderToken, validOrderToken } from "../src/lib/order-token";
describe("Money and access boundaries", () => {
  it("extracts GST without adding it twice", () => {
    expect(taxOn(1100, defaultTax)).toBe(100);
    expect(taxOn(1000, { ...defaultTax, pricesIncludeTax: false })).toBe(100);
    expect(taxOn(1100, { ...defaultTax, enabled: false })).toBe(0);
  });
  it("restricts staff and customers", () => {
    expect(can("CUSTOMER", "orders.manage")).toBe(false);
    expect(can("STAFF", "orders.manage")).toBe(true);
    expect(can("STAFF", "payments.manage")).toBe(false);
    expect(can("ADMIN", "settings.manage")).toBe(false);
    expect(can("SUPER_ADMIN", "admins.manage", [])).toBe(true);
  });
  it("blocks external redirect targets", () => {
    expect(safeNext("https://bad.test")).toBe("/account");
    expect(safeNext("//bad.test")).toBe("/account");
    expect(safeNext("/\\bad.test")).toBe("/account");
    expect(safeNext("/cart")).toBe("/cart");
  });
  it("rejects bad cart quantities", () => {
    expect(
      cartItemSchema.safeParse({
        variantId: "claaaaaaaaaaaaaaaaaaaaaaa",
        quantity: -1,
      }).success,
    ).toBe(false);
    expect(
      cartItemSchema.safeParse({
        variantId: "claaaaaaaaaaaaaaaaaaaaaaa",
        quantity: 1.5,
      }).success,
    ).toBe(false);
  });
  it("requires authentic guest order access tokens", () => {
    process.env.AUTH_SECRET =
      "a-long-test-secret-that-is-over-thirty-two-characters";
    const token = orderToken("order-a");
    expect(validOrderToken("order-a", token)).toBe(true);
    expect(validOrderToken("order-b", token)).toBe(false);
    expect(validOrderToken("order-a", "anything")).toBe(false);
  });
});
