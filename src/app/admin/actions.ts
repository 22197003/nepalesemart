"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { text, formError, UserError, httpsUrl } from "@/lib/forms";
import { slugify } from "@/lib/utils";
import type { FormState } from "@/components/action-form";
import { setOrderStatus } from "@/services/orders";
import { getPaymentProvider } from "@/lib/payments";
import { PERMISSIONS } from "@/lib/rbac";
const cents = z.coerce.number().int().min(0).max(1000000);
const required = z.string().trim().min(1).max(160);
const id = (f: FormData) => text(f, "id");
const bool = (f: FormData, k: string) => f.get(k) === "on";
async function audit(
  adminId: string,
  action: string,
  entity: string,
  entityId: string,
) {
  await db.auditLog.create({ data: { adminId, action, entity, entityId } });
}
function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}
export async function saveProduct(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("products.manage");
  try {
    const data = z
      .object({
        name: required,
        sku: required,
        categoryId: z.string().cuid(),
        description: z.string().max(10000),
        shortDescription: z.string().max(300),
        priceCents: cents,
        salePriceCents: cents.nullable(),
        status: z.enum(["ACTIVE", "DRAFT", "OUT_OF_STOCK", "ARCHIVED"]),
        storageType: z.enum(["AMBIENT", "FROZEN", "REFRIGERATED"]),
        ingredients: z.string().max(2000),
        storageInstructions: z.string().max(2000),
        weightGrams: z.coerce.number().int().min(0).max(1000000),
      })
      .parse({
        name: text(f, "name"),
        sku: text(f, "sku"),
        categoryId: text(f, "categoryId"),
        description: text(f, "description"),
        shortDescription: text(f, "shortDescription"),
        priceCents: text(f, "priceCents"),
        salePriceCents:
          text(f, "salePriceCents") === ""
            ? null
            : Number(text(f, "salePriceCents")),
        status: text(f, "status"),
        storageType: text(f, "storageType"),
        ingredients: text(f, "ingredients"),
        storageInstructions: text(f, "storageInstructions"),
        weightGrams: text(f, "weightGrams") || 0,
      });
    if (data.salePriceCents !== null && data.salePriceCents >= data.priceCents)
      throw new UserError("Sale price must be below the regular price.");
    const imageUrl = text(f, "imageUrl").trim();
    if (imageUrl) httpsUrl.parse(imageUrl);
    const stockQty = z.coerce
      .number()
      .int()
      .min(0)
      .parse(text(f, "stockQty") || 0);
    const productId = id(f);
    const product = await db.$transaction(async (tx) => {
      const common = {
        ...data,
        isTaxable: bool(f, "isTaxable"),
        shippingEligible: bool(f, "shippingEligible"),
        isFeatured: bool(f, "isFeatured"),
        isBestseller: bool(f, "isBestseller"),
        isNewArrival: bool(f, "isNewArrival"),
        allergens: text(f, "allergens")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
      const p = productId
        ? await tx.product.update({ where: { id: productId }, data: common })
        : await tx.product.create({
            data: {
              ...common,
              slug: slugify(data.name) + "-" + Date.now().toString(36),
              tags: [],
              variants: {
                create: {
                  name: text(f, "variantName") || "Default",
                  sku: data.sku + "-DEFAULT",
                  priceCents: data.priceCents,
                  salePriceCents: data.salePriceCents,
                  stockQty,
                  weightGrams: data.weightGrams,
                },
              },
            },
          });
      if (productId) {
        const variantId = text(f, "variantId");
        const v = await tx.productVariant.findFirst({
          where: { id: variantId, productId: p.id },
        });
        if (v)
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              priceCents: data.priceCents,
              salePriceCents: data.salePriceCents,
              weightGrams: data.weightGrams,
            },
          });
      }
      if (!productId) {
        const v = await tx.productVariant.findFirstOrThrow({
          where: { productId: p.id },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: v.id,
            delta: stockQty,
            balanceAfter: stockQty,
            reason: "INITIAL",
            createdById: s.userId,
          },
        });
      }
      if (imageUrl) {
        await tx.productImage.deleteMany({
          where: { productId: p.id, isThumbnail: true },
        });
        await tx.productImage.create({
          data: {
            productId: p.id,
            url: imageUrl,
            alt: p.name,
            isThumbnail: true,
            sortOrder: -1,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          adminId: s.userId,
          action: productId ? "product.update" : "product.create",
          entity: "Product",
          entityId: p.id,
        },
      });
      return p;
    });
    refresh();
    return { message: `Saved ${product.name}.` };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function adjustStock(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("inventory.manage");
  try {
    const delta = z.coerce
      .number()
      .int()
      .min(-100000)
      .max(100000)
      .parse(text(f, "delta"));
    const note = z.string().trim().min(3).max(300).parse(text(f, "note"));
    await db.$transaction(async (tx) => {
      const updated = await tx.productVariant.updateMany({
        where: { id: id(f), stockQty: { gte: Math.max(0, -delta) } },
        data: { stockQty: { increment: delta } },
      });
      if (!updated.count) throw new UserError("Stock cannot be negative.");
      const v = await tx.productVariant.findUniqueOrThrow({
        where: { id: id(f) },
      });
      await tx.inventoryTransaction.create({
        data: {
          variantId: v.id,
          delta,
          balanceAfter: v.stockQty,
          reason: delta > 0 ? "RESTOCK" : "ADJUSTMENT",
          note,
          createdById: s.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: s.userId,
          action: "inventory.adjust",
          entity: "ProductVariant",
          entityId: v.id,
          metadata: { delta, note },
        },
      });
    });
    refresh();
    return { message: "Inventory updated." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function updateOrder(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("orders.manage");
  try {
    const status = z
      .enum([
        "CONFIRMED",
        "PREPARING",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ])
      .parse(text(f, "status"));
    await setOrderStatus(id(f), status, text(f, "note"), s.userId);
    refresh();
    return { message: "Order updated." };
  } catch (e) {
    return {
      error:
        e instanceof Error && e.name === "CheckoutError"
          ? e.message
          : formError(e),
    };
  }
}
export async function saveShipment(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("orders.manage");
  try {
    const trackingUrl = text(f, "trackingUrl");
    if (trackingUrl) httpsUrl.parse(trackingUrl);
    await db.shipment.create({
      data: {
        orderId: id(f),
        carrier: required.parse(text(f, "carrier")),
        trackingNumber: required.parse(text(f, "trackingNumber")),
        trackingUrl: trackingUrl || null,
        shippedAt: new Date(),
      },
    });
    await audit(s.userId, "shipment.create", "Order", id(f));
    refresh();
    return { message: "Tracking saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function refundPayment(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("payments.manage");
  try {
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: id(f) },
    });
    if (
      !payment.providerPaymentId ||
      !["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)
    )
      throw new UserError("This payment cannot be refunded.");
    const amountCents = cents.parse(text(f, "amountCents"));
    if (
      !amountCents ||
      amountCents > payment.amountCents - payment.refundedCents
    )
      throw new UserError("Invalid refund amount.");
    const refund = await getPaymentProvider().refund(
      payment.providerPaymentId,
      amountCents,
      `refund-${payment.id}-${z.string().uuid().parse(text(f, "requestId"))}`,
    );
    await db.payment.update({
      where: { id: payment.id },
      data: { providerRefundId: refund.providerRefundId },
    });
    await audit(s.userId, "payment.refund_requested", "Payment", payment.id);
    refresh();
    return {
      message: "Refund requested. The payment webhook will confirm the result.",
    };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveCategory(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("categories.manage");
  try {
    const name = required.parse(text(f, "name"));
    const data = {
      name,
      slug: slugify(required.parse(text(f, "slug") || name)),
      isActive: bool(f, "isActive"),
      isFeatured: bool(f, "isFeatured"),
      description: text(f, "description").slice(0, 2000),
    };
    const c = id(f)
      ? await db.category.update({ where: { id: id(f) }, data })
      : await db.category.create({ data });
    await audit(s.userId, "category.save", "Category", c.id);
    refresh();
    return { message: "Category saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveCoupon(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("coupons.manage");
  try {
    const type = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).parse(text(f, "type"));
    const value = cents.parse(text(f, "value"));
    if (type === "PERCENTAGE" && (value < 1 || value > 100))
      throw new UserError("Percentage must be 1–100.");
    const expiresAt = text(f, "expiresAt")
      ? z.coerce.date().parse(text(f, "expiresAt"))
      : null;
    const data = {
      code: required.parse(text(f, "code")).toUpperCase(),
      type,
      value,
      minOrderCents: cents.parse(text(f, "minOrderCents") || 0),
      expiresAt,
      isActive: bool(f, "isActive"),
      freeShipping: bool(f, "freeShipping"),
    };
    const c = id(f)
      ? await db.coupon.update({ where: { id: id(f) }, data })
      : await db.coupon.create({ data });
    await audit(s.userId, "coupon.save", "Coupon", c.id);
    refresh();
    return { message: "Coupon saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveBanner(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("banners.manage");
  try {
    const ctaHref = text(f, "ctaHref");
    if (ctaHref && !/^\/(?!\/)/.test(ctaHref))
      throw new UserError("Link must be a site path such as /shop.");
    const imageUrl = text(f, "imageUrl");
    if (imageUrl) httpsUrl.parse(imageUrl);
    const data = {
      title: required.parse(text(f, "title")),
      subtitle: text(f, "subtitle").slice(0, 500),
      placement: z
        .enum(["HERO", "PROMO", "ANNOUNCEMENT"])
        .parse(text(f, "placement")),
      ctaLabel: text(f, "ctaLabel").slice(0, 60),
      ctaHref,
      imageUrl: imageUrl || null,
      isActive: bool(f, "isActive"),
      sortOrder: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "sortOrder") || 0),
    };
    const b = id(f)
      ? await db.banner.update({ where: { id: id(f) }, data })
      : await db.banner.create({ data });
    await audit(s.userId, "banner.save", "Banner", b.id);
    refresh();
    return { message: "Banner saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveDelivery(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("delivery.manage");
  try {
    const data = {
      priceCents: cents.parse(text(f, "priceCents")),
      freeThresholdCents:
        text(f, "freeThresholdCents") === ""
          ? null
          : cents.parse(text(f, "freeThresholdCents")),
      minOrderCents: cents.parse(text(f, "minOrderCents") || 0),
      maxWeightGrams:
        text(f, "maxWeightGrams") === ""
          ? null
          : z.coerce.number().int().min(0).parse(text(f, "maxWeightGrams")),
      isActive: bool(f, "isActive"),
    };
    await db.shippingRate.update({ where: { id: id(f) }, data });
    await audit(s.userId, "delivery.rate_update", "ShippingRate", id(f));
    refresh();
    return { message: "Delivery rate saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveSetting(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("settings.manage");
  try {
    const key = z.enum(["brand", "tax", "coldChain"]).parse(text(f, "key"));
    let value;
    if (key === "brand")
      value = z
        .object({
          name: required,
          shortName: required,
          tagline: z.string().max(300),
          supportEmail: z.string().email(),
          supportPhone: z.string().max(30),
          abn: z.string().max(20),
        })
        .parse(Object.fromEntries(f));
    else if (key === "tax")
      value = {
        enabled: bool(f, "enabled"),
        ratePercent: z.coerce
          .number()
          .min(0)
          .max(100)
          .parse(text(f, "ratePercent")),
        pricesIncludeTax: bool(f, "pricesIncludeTax"),
      };
    else
      value = {
        states: text(f, "states")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await audit(s.userId, "settings.save", "SiteSetting", key);
    refresh();
    return { message: "Settings saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveContent(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("content.manage");
  try {
    const key = z
      .enum(["about", "faq", "delivery-policy", "returns", "privacy", "terms"])
      .parse(text(f, "key"));
    const value = {
      title: required.parse(text(f, "title")),
      body: z.string().max(20000).parse(text(f, "body")),
    };
    await db.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    await audit(s.userId, "content.save", "SiteSetting", key);
    refresh();
    return { message: "Page content saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function moderateReview(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("reviews.manage");
  try {
    const status = z
      .enum(["APPROVED", "HIDDEN", "PENDING"])
      .parse(text(f, "status"));
    await db.$transaction(async (tx) => {
      const r = await tx.review.update({
        where: { id: id(f) },
        data: { status },
      });
      const agg = await tx.review.aggregate({
        where: { productId: r.productId, status: "APPROVED" },
        _avg: { rating: true },
        _count: true,
      });
      await tx.product.update({
        where: { id: r.productId },
        data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
      });
      await tx.auditLog.create({
        data: {
          adminId: s.userId,
          action: "review.moderate",
          entity: "Review",
          entityId: r.id,
        },
      });
    });
    refresh();
    return { message: "Review moderated." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function updateCustomer(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("customers.manage");
  try {
    const customer = await db.user.findFirst({
      where: { id: id(f), role: "CUSTOMER" },
    });
    if (!customer) throw new UserError("Customer not found.");
    const status = z.enum(["ACTIVE", "DISABLED"]).parse(text(f, "status"));
    await db.user.update({
      where: { id: customer.id },
      data: { status, sessionVersion: { increment: 1 } },
    });
    await audit(s.userId, "customer.status", "User", customer.id);
    refresh();
    return { message: "Customer updated." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function updateAdmin(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("admins.manage");
  try {
    if (id(f) === s.userId)
      throw new UserError("You cannot change your own access.");
    const role = z
      .enum(["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"])
      .parse(text(f, "role"));
    await db.user.update({
      where: { id: id(f) },
      data: { role, sessionVersion: { increment: 1 } },
    });
    await audit(s.userId, "admin.role_change", "User", id(f));
    refresh();
    return { message: "Role updated." };
  } catch (e) {
    return { error: formError(e) };
  }
}

export async function saveVariant(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("products.manage");
  try {
    const data = {
      name: required.parse(text(f, "name")),
      sku: required.parse(text(f, "sku")),
      priceCents: cents.parse(text(f, "priceCents")),
      salePriceCents:
        text(f, "salePriceCents") === ""
          ? null
          : cents.parse(text(f, "salePriceCents")),
      weightGrams: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "weightGrams") || 0),
      isActive: bool(f, "isActive"),
    };
    if (data.salePriceCents !== null && data.salePriceCents >= data.priceCents)
      throw new UserError("Sale price must be below regular price.");
    const productId = z.string().cuid().parse(text(f, "productId"));
    await db.$transaction(async (tx) => {
      if (id(f)) {
        const v = await tx.productVariant.findFirst({
          where: { id: id(f), productId },
        });
        if (!v) throw new UserError("Variant not found.");
        await tx.productVariant.update({ where: { id: v.id }, data });
      } else {
        const stockQty = z.coerce
          .number()
          .int()
          .min(0)
          .parse(text(f, "stockQty") || 0);
        const v = await tx.productVariant.create({
          data: { ...data, productId, stockQty },
        });
        await tx.inventoryTransaction.create({
          data: {
            variantId: v.id,
            delta: stockQty,
            balanceAfter: stockQty,
            reason: "INITIAL",
            createdById: s.userId,
          },
        });
      }
      const cheapest = await tx.productVariant.findFirst({
        where: { productId, isActive: true },
        orderBy: { priceCents: "asc" },
      });
      if (cheapest)
        await tx.product.update({
          where: { id: productId },
          data: {
            priceCents: cheapest.priceCents,
            salePriceCents: cheapest.salePriceCents,
          },
        });
      await tx.auditLog.create({
        data: {
          adminId: s.userId,
          action: "variant.save",
          entity: "Product",
          entityId: productId,
        },
      });
    });
    refresh();
    return { message: "Variant saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveZone(_: FormState, f: FormData): Promise<FormState> {
  const s = await requirePermission("delivery.manage");
  try {
    const states = text(f, "states")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    z.array(
      z.enum(["VIC", "NSW", "QLD", "ACT", "SA", "WA", "TAS", "NT"]),
    ).parse(states);
    const postcodes = text(f, "postcodes")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    z.array(z.string().regex(/^\d{4}(-\d{4})?$/)).parse(postcodes);
    const data = {
      name: required.parse(text(f, "name")),
      states,
      postcodes,
      isActive: bool(f, "isActive"),
      sortOrder: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "sortOrder") || 0),
    };
    const zone = id(f)
      ? await db.shippingZone.update({ where: { id: id(f) }, data })
      : await db.shippingZone.create({ data });
    await audit(s.userId, "delivery.zone_save", "ShippingZone", zone.id);
    refresh();
    return { message: "Zone saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveMethod(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("delivery.manage");
  try {
    const data = {
      code: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(40)
        .parse(text(f, "code")),
      name: required.parse(text(f, "name")),
      description: text(f, "description").slice(0, 1000),
      type: z.enum(["DELIVERY", "PICKUP"]).parse(text(f, "type")),
      isActive: bool(f, "isActive"),
      minDays: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "minDays") || 0),
      maxDays: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "maxDays") || 0),
    };
    if (data.minDays > data.maxDays)
      throw new UserError("Maximum days must be at least minimum days.");
    const method = id(f)
      ? await db.shippingMethod.update({ where: { id: id(f) }, data })
      : await db.shippingMethod.create({ data });
    await audit(s.userId, "delivery.method_save", "ShippingMethod", method.id);
    refresh();
    return { message: "Method saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function addRate(_: FormState, f: FormData): Promise<FormState> {
  const s = await requirePermission("delivery.manage");
  try {
    const zoneId = z.string().cuid().parse(text(f, "zoneId")),
      methodId = z.string().cuid().parse(text(f, "methodId"));
    const priceCents = cents.parse(text(f, "priceCents"));
    const r = await db.shippingRate.upsert({
      where: { zoneId_methodId: { zoneId, methodId } },
      create: { zoneId, methodId, priceCents },
      update: { priceCents, isActive: true },
    });
    await audit(s.userId, "delivery.rate_save", "ShippingRate", r.id);
    refresh();
    return { message: "Rate saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function saveSection(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("content.manage");
  try {
    const data = {
      type: z
        .enum([
          "FEATURED_CATEGORIES",
          "BEST_SELLERS",
          "NEW_ARRIVALS",
          "READY_TO_EAT",
          "WHY_US",
          "PROMO",
          "TESTIMONIALS",
          "NEWSLETTER",
          "PRODUCT_GRID",
        ])
        .parse(text(f, "type")),
      title: text(f, "title").slice(0, 160),
      subtitle: text(f, "subtitle").slice(0, 500),
      sortOrder: z.coerce
        .number()
        .int()
        .min(0)
        .parse(text(f, "sortOrder") || 0),
      isActive: bool(f, "isActive"),
      config: {
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(24)
          .parse(text(f, "limit") || 8),
        categorySlug: text(f, "categorySlug").slice(0, 100),
      },
    };
    const section = id(f)
      ? await db.homepageSection.update({ where: { id: id(f) }, data })
      : await db.homepageSection.create({ data });
    await audit(
      s.userId,
      "homepage.section_save",
      "HomepageSection",
      section.id,
    );
    refresh();
    return { message: "Homepage section saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
export async function savePermissions(
  _: FormState,
  f: FormData,
): Promise<FormState> {
  const s = await requirePermission("admins.manage");
  try {
    const role = z.enum(["STAFF", "ADMIN"]).parse(text(f, "role"));
    const permissions = [
      ...new Set(["dashboard.view", ...f.getAll("permissions").map(String)]),
    ];
    if (
      permissions.some(
        (p) => !PERMISSIONS.includes(p as (typeof PERMISSIONS)[number]),
      )
    )
      throw new UserError("Unknown permission.");
    await db.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { role } });
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ role, permission })),
      });
      await tx.auditLog.create({
        data: {
          adminId: s.userId,
          action: "admin.permissions_save",
          entity: "Role",
          entityId: role,
          metadata: { permissions },
        },
      });
    });
    refresh();
    return { message: "Role permissions saved." };
  } catch (e) {
    return { error: formError(e) };
  }
}
