import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
const providerState = vi.hoisted(() => ({ failCreate: false }));
vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({
    name: "stripe",
    createPayment: vi.fn(async ({ orderId }: { orderId: string }) => {
      if (providerState.failCreate)
        throw new Error("Uncertain network outcome");
      return {
        providerPaymentId: `pi_test_${orderId}`,
        clientSecret: "test-secret",
      };
    }),
    cancelPayment: vi.fn(async () => {}),
    refund: vi.fn(async () => ({ providerRefundId: "re_test" })),
  }),
}));
import { db } from "../src/lib/db";
import {
  createOrderAndPayment,
  releaseStock,
  setOrderStatus,
} from "../src/services/orders";
import { processPaymentEvent } from "../src/services/webhooks";
import { priceCart } from "../src/services/pricing";
import { findZone } from "../src/services/shipping";
const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite("Postgres order lifecycle", () => {
  let categoryId: string;
  const products: string[] = [];
  const orders: string[] = [];
  beforeAll(async () => {
    const c = await db.category.create({
      data: { name: "Test category", slug: `test-${randomUUID()}` },
    });
    categoryId = c.id;
  });
  afterAll(async () => {
    await db.order.deleteMany({ where: { id: { in: orders } } });
    await db.product.deleteMany({ where: { id: { in: products } } });
    await db.category.delete({ where: { id: categoryId } });
    await db.$disconnect();
  });
  async function variant(
    stock = 5,
    storageType: "AMBIENT" | "FROZEN" = "AMBIENT",
  ) {
    const sku = `TEST-${randomUUID()}`;
    const p = await db.product.create({
      data: {
        name: "Test tea",
        sku,
        slug: sku.toLowerCase(),
        categoryId,
        status: "ACTIVE",
        priceCents: 1100,
        tags: [],
        allergens: [],
        storageType,
        variants: {
          create: {
            name: "Default",
            sku: `${sku}-V`,
            priceCents: 1100,
            stockQty: stock,
            weightGrams: 100,
          },
        },
      },
      include: { variants: true },
    });
    products.push(p.id);
    return p.variants[0]!;
  }
  const input = {
    customer: {
      firstName: "Test",
      lastName: "Buyer",
      email: "test-order@example.com",
      phone: "0412345678",
    },
    address: {
      line1: "1 Test Street",
      suburb: "Melbourne",
      state: "VIC" as const,
      postcode: "3000",
      country: "AU" as const,
    },
    shippingMethodCode: "standard",
  };
  async function order(variantId: string, quantity = 1) {
    const r = await createOrderAndPayment({
      items: [{ variantId, quantity }],
      input,
    });
    orders.push(r.orderId);
    return r;
  }
  it("reserves stock and persists server-calculated totals", async () => {
    const v = await variant();
    const o = await order(v.id, 2);
    const row = await db.order.findUniqueOrThrow({ where: { id: o.orderId } });
    expect(row.subtotalCents).toBe(2200);
    expect(row.totalCents).toBe(3000);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(3);
  });
  it("does not oversell the final unit", async () => {
    const v = await variant(1);
    const results = await Promise.allSettled([order(v.id), order(v.id)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(0);
  });
  it("normalizes duplicate variant entries before checking stock", async () => {
    const v = await variant(3);
    const p = await priceCart({
      items: [
        { variantId: v.id, quantity: 2 },
        { variantId: v.id, quantity: 2 },
      ],
    });
    expect(p.issues.length).toBeGreaterThan(0);
    expect(p.lines).toHaveLength(1);
  });
  it("restores stock at most once", async () => {
    const v = await variant();
    const o = await order(v.id, 2);
    await releaseStock(o.orderId, "CANCELLATION");
    await releaseStock(o.orderId, "CANCELLATION");
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(5);
  });
  it("processes webhook retries and logical duplicates once", async () => {
    const v = await variant();
    const o = await order(v.id);
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: o.orderId },
    });
    const event = {
      id: `evt_${randomUUID()}`,
      kind: "payment.succeeded" as const,
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    };
    await processPaymentEvent(event);
    expect((await processPaymentEvent(event)).duplicate).toBe(true);
    await processPaymentEvent({ ...event, id: `evt_${randomUUID()}` });
    expect(
      (await db.product.findUniqueOrThrow({ where: { id: v.productId } }))
        .soldCount,
    ).toBe(1);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: o.orderId } })).status,
    ).toBe("CONFIRMED");
  });
  it("rolls back the webhook receipt when processing fails", async () => {
    const id = `evt_${randomUUID()}`;
    await expect(
      processPaymentEvent({
        id,
        kind: "payment.succeeded",
        providerPaymentId: "missing-payment",
        orderId: "missing-order",
      }),
    ).rejects.toThrow();
    expect(await db.webhookEvent.findUnique({ where: { id } })).toBeNull();
  });
  it("does not let a delayed failed event undo payment", async () => {
    const v = await variant();
    const o = await order(v.id);
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: o.orderId },
    });
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "payment.succeeded",
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    });
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "payment.failed",
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    });
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: o.orderId } }))
        .paymentStatus,
    ).toBe("PAID");
  });
  it("rejects fulfilling an unpaid order", async () => {
    const v = await variant();
    const o = await order(v.id);
    await expect(setOrderStatus(o.orderId, "CONFIRMED")).rejects.toThrow(
      "Payment must be confirmed",
    );
  });
  it("blocks cold delivery unless a destination is explicitly enabled", async () => {
    const v = await variant(5, "FROZEN");
    const p = await priceCart({
      items: [{ variantId: v.id, quantity: 1 }],
      shippingMethodCode: "standard",
      state: "NSW",
      postcode: "2000",
    });
    expect(p.issues.some((x) => x.includes("Frozen"))).toBe(true);
  });
  it("uses regional fallback outside a postcode-specific zone", async () => {
    expect((await findZone("VIC", "3500"))?.name).toBe("Victoria (Regional)");
  });
  it("reuses a checkout request without reserving stock twice", async () => {
    const v = await variant();
    const cart = await db.cart.create({
      data: {
        guestToken: randomUUID(),
        items: { create: { variantId: v.id, quantity: 1 } },
      },
    });
    const checkoutKey = randomUUID();
    const args = {
      items: [{ variantId: v.id, quantity: 1 }],
      input,
      cartId: cart.id,
      checkoutKey,
    };
    const a = await createOrderAndPayment(args);
    orders.push(a.orderId);
    const b = await createOrderAndPayment(args);
    expect(b.orderId).toBe(a.orderId);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(4);
    await db.cart.delete({ where: { id: cart.id } });
  });
  it("clears purchased quantities and queues confirmation after payment", async () => {
    const v = await variant();
    const cart = await db.cart.create({
      data: {
        guestToken: randomUUID(),
        items: { create: { variantId: v.id, quantity: 3 } },
      },
    });
    const o = await createOrderAndPayment({
      items: [{ variantId: v.id, quantity: 2 }],
      input,
      cartId: cart.id,
    });
    orders.push(o.orderId);
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: o.orderId },
    });
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "payment.succeeded",
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    });
    expect(
      (await db.cartItem.findFirstOrThrow({ where: { cartId: cart.id } }))
        .quantity,
    ).toBe(1);
    const n = await db.notification.findFirst({
      where: {
        template: "order_confirmation",
        payload: { path: ["subject"], string_contains: o.orderNumber },
      },
    });
    expect(n?.status).toBe("QUEUED");
    await db.cart.delete({ where: { id: cart.id } });
  });
  it("refund retries never replenish stock twice", async () => {
    const v = await variant();
    const o = await order(v.id, 2);
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: o.orderId },
    });
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "payment.succeeded",
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    });
    for (let i = 0; i < 2; i++)
      await processPaymentEvent({
        id: `evt_${randomUUID()}`,
        kind: "refund.updated",
        providerPaymentId: p.providerPaymentId!,
        refundedCents: p.amountCents,
      });
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(5);
    expect(
      (await db.order.findUniqueOrThrow({ where: { id: o.orderId } }))
        .paymentStatus,
    ).toBe("REFUNDED");
  });
  it("keeps shipped inventory out of stock after a refund", async () => {
    const v = await variant();
    const o = await order(v.id);
    const p = await db.payment.findFirstOrThrow({
      where: { orderId: o.orderId },
    });
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "payment.succeeded",
      providerPaymentId: p.providerPaymentId!,
      orderId: o.orderId,
    });
    await setOrderStatus(o.orderId, "PREPARING");
    await setOrderStatus(o.orderId, "PACKED");
    await setOrderStatus(o.orderId, "SHIPPED");
    await processPaymentEvent({
      id: `evt_${randomUUID()}`,
      kind: "refund.updated",
      providerPaymentId: p.providerPaymentId!,
      refundedCents: p.amountCents,
    });
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(4);
  });
  it("reserves coupon usage and returns it on cancellation", async () => {
    const v = await variant();
    const coupon = await db.coupon.create({
      data: {
        code: `TEST-${randomUUID().toUpperCase()}`,
        type: "PERCENTAGE",
        value: 10,
        usageLimit: 1,
      },
    });
    const o = await createOrderAndPayment({
      items: [{ variantId: v.id, quantity: 1 }],
      input: { ...input, couponCode: coupon.code },
    });
    orders.push(o.orderId);
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(1);
    await expect(
      createOrderAndPayment({
        items: [{ variantId: v.id, quantity: 1 }],
        input: { ...input, couponCode: coupon.code },
      }),
    ).rejects.toThrow("usage limit");
    await setOrderStatus(o.orderId, "CANCELLED");
    expect(
      (await db.coupon.findUniqueOrThrow({ where: { id: coupon.id } }))
        .usedCount,
    ).toBe(0);
    await db.coupon.delete({ where: { id: coupon.id } });
  });
  it("calculates GST correctly for coupons scoped to untaxed products", async () => {
    const taxable = await variant(),
      untaxed = await variant();
    await db.product.update({
      where: { id: untaxed.productId },
      data: { isTaxable: false },
    });
    const coupon = await db.coupon.create({
      data: {
        code: `TEST-${randomUUID().toUpperCase()}`,
        type: "PERCENTAGE",
        value: 100,
        products: { connect: { id: untaxed.productId } },
      },
    });
    const p = await priceCart({
      items: [
        { variantId: taxable.id, quantity: 1 },
        { variantId: untaxed.id, quantity: 1 },
      ],
      couponCode: coupon.code,
    });
    expect(p.discountCents).toBe(1100);
    expect(p.taxCents).toBe(100);
    await db.coupon.delete({ where: { id: coupon.id } });
  });
  it("holds stock after uncertain payment setup until safe reconciliation", async () => {
    const v = await variant();
    const checkoutKey = randomUUID();
    providerState.failCreate = true;
    try {
      await expect(
        createOrderAndPayment({
          items: [{ variantId: v.id, quantity: 1 }],
          input,
          checkoutKey,
        }),
      ).rejects.toThrow("could not be confirmed");
    } finally {
      providerState.failCreate = false;
    }
    const o = await db.order.findUniqueOrThrow({ where: { checkoutKey } });
    orders.push(o.id);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(4);
    await setOrderStatus(o.id, "CANCELLED");
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: v.id } }))
        .stockQty,
    ).toBe(5);
  });
});
