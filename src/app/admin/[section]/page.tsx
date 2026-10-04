import { AdminSections } from "@/components/admin-sections";
import { AdminPermissions } from "@/components/admin-permissions";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import type { Permission } from "@/lib/rbac";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { getBrand, getTaxSettings } from "@/services/settings";
import * as actions from "../actions";
const permissions: Record<string, Permission> = {
  categories: "categories.manage",
  inventory: "inventory.manage",
  orders: "orders.manage",
  customers: "customers.manage",
  reviews: "reviews.manage",
  coupons: "coupons.manage",
  delivery: "delivery.manage",
  banners: "banners.manage",
  content: "content.manage",
  settings: "settings.manage",
  analytics: "analytics.view",
  payments: "payments.manage",
  admins: "admins.manage",
  audit: "audit.view",
};
function Check({
  name,
  label,
  checked = true,
}: {
  name: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="inline-block pr-5">
      <input name={name} type="checkbox" defaultChecked={checked} /> {label}
    </label>
  );
}
function Id({ id }: { id: string }) {
  return <input name="id" type="hidden" value={id} />;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card mb-5 p-5">{children}</div>;
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { section } = await params;
  if (!permissions[section]) notFound();
  await requirePermission(permissions[section]);
  const query = await searchParams;
  let content: React.ReactNode;
  if (section === "inventory") {
    const rows = await db.productVariant.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { stockQty: "asc" },
      take: 100,
    });
    content = rows.map((v) => (
      <Card key={v.id}>
        <h2 className="text-xl">
          {v.product.name} — {v.name}
        </h2>
        <p>
          {v.sku}: {v.stockQty} in stock
          {v.stockQty <= v.lowStockThreshold ? " · Low stock" : ""}
        </p>
        <ActionForm
          className="mt-3 space-y-3"
          action={actions.adjustStock}
          label="Adjust stock"
        >
          <Id id={v.id} />
          <Field
            name="delta"
            label="Quantity change (+ restock, − remove)"
            type="number"
            required
          />
          <Field name="note" label="Reason" required />
        </ActionForm>
      </Card>
    ));
  } else if (section === "orders") {
    const rows = await db.order.findMany({
      where:
        query.status &&
        [
          "PENDING",
          "CONFIRMED",
          "PREPARING",
          "PACKED",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "REFUNDED",
        ].includes(query.status)
          ? { status: query.status as never }
          : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true, shipments: true },
    });
    content = (
      <>
        <form className="mb-4 flex gap-3">
          <select className="input" name="status">
            <option value="">All statuses</option>
            {[
              "PENDING",
              "CONFIRMED",
              "PREPARING",
              "PACKED",
              "SHIPPED",
              "OUT_FOR_DELIVERY",
              "DELIVERED",
              "CANCELLED",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button className="btn-secondary">Filter</button>
        </form>
        {rows.map((o) => (
          <Card key={o.id}>
            <h2 className="text-xl">
              {o.orderNumber} · {formatMoney(o.totalCents)}
            </h2>
            <p>
              {o.firstName} {o.lastName} · {o.email} · {o.phone}
            </p>
            <p>
              {o.status} / {o.paymentStatus}
            </p>
            <p>
              {o.shipLine1}, {o.shipSuburb} {o.shipState} {o.shipPostcode}
            </p>
            {o.items.map((i) => (
              <p key={i.id}>
                {i.quantity} × {i.name} ({i.variantName})
              </p>
            ))}
            <ActionForm
              className="mt-4 space-y-3"
              action={actions.updateOrder}
              label="Update status"
            >
              <Id id={o.id} />
              <select name="status" className="input" defaultValue={o.status}>
                {[
                  "CONFIRMED",
                  "PREPARING",
                  "PACKED",
                  "SHIPPED",
                  "OUT_FOR_DELIVERY",
                  "DELIVERED",
                  "CANCELLED",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <Field name="note" label="Internal note" />
            </ActionForm>
            <details className="mt-4">
              <summary>Add tracking</summary>
              <ActionForm action={actions.saveShipment}>
                <Id id={o.id} />
                <Field name="carrier" label="Carrier" required />
                <Field name="trackingNumber" label="Tracking number" required />
                <Field name="trackingUrl" label="HTTPS tracking URL" />
              </ActionForm>
            </details>
          </Card>
        ))}
      </>
    );
  } else if (section === "categories") {
    const rows = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
    content = [null, ...rows].map((c) => (
      <Card key={c?.id ?? "new"}>
        <h2 className="mb-4 text-xl">{c ? c.name : "Add category"}</h2>
        <ActionForm action={actions.saveCategory}>
          <Id id={c?.id ?? ""} />
          <Field name="name" label="Name" value={c?.name} required />
          <Field name="slug" label="URL slug" value={c?.slug} />
          <Field
            name="description"
            label="Description"
            value={c?.description ?? ""}
          />
          <Check name="isActive" label="Active" checked={c?.isActive ?? true} />
          <Check
            name="isFeatured"
            label="Featured on homepage"
            checked={c?.isFeatured ?? false}
          />
        </ActionForm>
      </Card>
    ));
  } else if (section === "coupons") {
    const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
    content = [null, ...rows].map((c) => (
      <Card key={c?.id ?? "new"}>
        <h2 className="mb-4 text-xl">
          {c ? `${c.code} (${c.usedCount} used)` : "Add coupon"}
        </h2>
        <ActionForm action={actions.saveCoupon}>
          <Id id={c?.id ?? ""} />
          <Field name="code" label="Code" value={c?.code} required />
          <label>
            Type
            <select className="input" name="type" defaultValue={c?.type}>
              <option>PERCENTAGE</option>
              <option>FIXED_AMOUNT</option>
            </select>
          </label>
          <Field
            name="value"
            label="Value (percent or cents)"
            type="number"
            value={c?.value}
            required
          />
          <Field
            name="minOrderCents"
            label="Minimum order (cents)"
            type="number"
            value={c?.minOrderCents ?? 0}
          />
          <Field
            name="expiresAt"
            label="Expiry date"
            type="date"
            value={c?.expiresAt?.toISOString().slice(0, 10) ?? ""}
          />
          <Check name="isActive" label="Active" checked={c?.isActive ?? true} />
          <Check
            name="freeShipping"
            label="Free shipping"
            checked={c?.freeShipping ?? false}
          />
        </ActionForm>
      </Card>
    ));
  } else if (section === "delivery") {
    const rows = await db.shippingRate.findMany({
      include: { zone: true, method: true },
    });
    content = (
      <>
        <p className="mb-5">
          Amounts are AUD cents. A blank threshold disables free delivery. Cold
          delivery destinations are controlled in Settings.
        </p>
        {rows.map((r) => (
          <Card key={r.id}>
            <h2 className="mb-4 text-xl">
              {r.zone.name} / {r.method.name}
            </h2>
            <p className="mb-4">
              {r.zone.states.join(", ")} · {r.zone.postcodes.join(", ")}
            </p>
            <ActionForm action={actions.saveDelivery}>
              <Id id={r.id} />
              <Field
                name="priceCents"
                label="Delivery charge (cents)"
                type="number"
                value={r.priceCents}
              />
              <Field
                name="freeThresholdCents"
                label="Free delivery threshold (cents)"
                type="number"
                value={r.freeThresholdCents ?? ""}
              />
              <Field
                name="minOrderCents"
                label="Minimum order (cents)"
                type="number"
                value={r.minOrderCents ?? 0}
              />
              <Field
                name="maxWeightGrams"
                label="Maximum weight (grams)"
                type="number"
                value={r.maxWeightGrams ?? ""}
              />
              <Check name="isActive" label="Active" checked={r.isActive} />
            </ActionForm>
          </Card>
        ))}
      </>
    );
  } else if (section === "banners") {
    const rows = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
    content = [null, ...rows].map((b) => (
      <Card key={b?.id ?? "new"}>
        <h2 className="mb-4 text-xl">{b ? b.title : "Add banner"}</h2>
        <ActionForm action={actions.saveBanner}>
          <Id id={b?.id ?? ""} />
          <Field name="title" label="Title" value={b?.title} required />
          <Field name="subtitle" label="Subtitle" value={b?.subtitle ?? ""} />
          <label>
            Placement
            <select
              className="input"
              name="placement"
              defaultValue={b?.placement}
            >
              {["HERO", "PROMO", "ANNOUNCEMENT"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <Field
            name="imageUrl"
            label="HTTPS image URL"
            value={b?.imageUrl ?? ""}
          />
          <Field
            name="ctaLabel"
            label="Button label"
            value={b?.ctaLabel ?? ""}
          />
          <Field
            name="ctaHref"
            label="Button path"
            value={b?.ctaHref ?? "/shop"}
          />
          <Field
            name="sortOrder"
            label="Sort order"
            type="number"
            value={b?.sortOrder ?? 0}
          />
          <Check name="isActive" label="Active" checked={b?.isActive ?? true} />
        </ActionForm>
      </Card>
    ));
  } else if (section === "content") {
    const keys = [
      "about",
      "faq",
      "delivery-policy",
      "returns",
      "privacy",
      "terms",
    ];
    const rows = await db.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    content = keys.map((key) => {
      const value = rows.find((r) => r.key === key)?.value as
        { title?: string; body?: string } | undefined;
      return (
        <Card key={key}>
          <h2 className="mb-4 text-xl">{key}</h2>
          <ActionForm action={actions.saveContent}>
            <input type="hidden" name="key" value={key} />
            <Field
              name="title"
              label="Title"
              value={value?.title ?? key}
              required
            />
            <label>
              Content
              <textarea
                className="input"
                rows={8}
                name="body"
                defaultValue={value?.body ?? ""}
              />
            </label>
          </ActionForm>
        </Card>
      );
    });
  } else if (section === "settings") {
    const b = await getBrand(),
      t = await getTaxSettings();
    const cold = await db.siteSetting.findUnique({
      where: { key: "coldChain" },
    });
    content = (
      <>
        <Card>
          <h2 className="mb-4 text-xl">Brand and contact details</h2>
          <ActionForm action={actions.saveSetting}>
            <input type="hidden" name="key" value="brand" />
            {(
              [
                "name",
                "shortName",
                "tagline",
                "supportEmail",
                "supportPhone",
                "abn",
              ] as const
            ).map((k) => (
              <Field key={k} name={k} label={k} value={b[k]} required />
            ))}
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl">GST</h2>
          <ActionForm action={actions.saveSetting}>
            <input type="hidden" name="key" value="tax" />
            <Field
              name="ratePercent"
              label="GST rate (%)"
              type="number"
              value={t.ratePercent}
            />
            <Check name="enabled" label="GST enabled" checked={t.enabled} />
            <Check
              name="pricesIncludeTax"
              label="Prices include GST"
              checked={t.pricesIncludeTax}
            />
          </ActionForm>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl">Frozen / refrigerated delivery</h2>
          <p className="mb-3">
            Only enable destinations supported by your cold delivery service.
            Empty means no delivery of cold products.
          </p>
          <ActionForm action={actions.saveSetting}>
            <input type="hidden" name="key" value="coldChain" />
            <Field
              name="states"
              label="Supported states (comma separated, e.g. VIC, NSW)"
              value={
                (
                  cold?.value as { states?: string[] } | undefined
                )?.states?.join(", ") ?? ""
              }
            />
          </ActionForm>
        </Card>
      </>
    );
  } else if (section === "customers" || section === "admins") {
    const rows = await db.user.findMany({
      where: section === "customers" ? { role: "CUSTOMER" } : {},
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
    content = rows.map((u) => (
      <Card key={u.id}>
        <p className="mb-3">
          {u.firstName} {u.lastName} · {u.email} · {u.role}
        </p>
        <ActionForm
          action={
            section === "customers"
              ? actions.updateCustomer
              : actions.updateAdmin
          }
        >
          <Id id={u.id} />
          {section === "customers" ? (
            <select className="input" name="status" defaultValue={u.status}>
              <option>ACTIVE</option>
              <option>DISABLED</option>
            </select>
          ) : (
            <select className="input" name="role" defaultValue={u.role}>
              {["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          )}
        </ActionForm>
      </Card>
    ));
  } else if (section === "reviews") {
    const rows = await db.review.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { name: true } },
        user: { select: { email: true } },
      },
    });
    content = rows.map((r) => (
      <Card key={r.id}>
        <h2 className="text-xl">
          {r.product.name} · {r.rating}/5
        </h2>
        <p>{r.user.email}</p>
        <h3>{r.title}</h3>
        <p className="mb-4">{r.body}</p>
        <ActionForm action={actions.moderateReview}>
          <Id id={r.id} />
          <select className="input" name="status" defaultValue={r.status}>
            {["PENDING", "APPROVED", "HIDDEN"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </ActionForm>
      </Card>
    ));
  } else if (section === "payments") {
    const rows = await db.payment.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { order: { select: { orderNumber: true } } },
    });
    content = rows.map((p) => (
      <Card key={p.id}>
        <h2 className="text-xl">
          {p.order.orderNumber} · {p.status}
        </h2>
        <p>
          Paid: {formatMoney(p.amountCents)} · Refunded:{" "}
          {formatMoney(p.refundedCents)}
        </p>
        {["PAID", "PARTIALLY_REFUNDED"].includes(p.status) && (
          <details className="mt-4">
            <summary>Request a refund</summary>
            <ActionForm action={actions.refundPayment} label="Request refund">
              <Id id={p.id} />
              <input name="requestId" type="hidden" value={randomUUID()} />
              <Field
                name="amountCents"
                label="Refund amount (cents)"
                type="number"
                required
              />
            </ActionForm>
          </details>
        )}
      </Card>
    ));
  } else if (section === "analytics") {
    const [products, payments, orders] = await Promise.all([
      db.product.findMany({
        orderBy: { soldCount: "desc" },
        take: 10,
        select: { id: true, name: true, soldCount: true },
      }),
      db.payment.aggregate({
        where: { status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
        _sum: { amountCents: true, refundedCents: true },
      }),
      db.order.groupBy({ by: ["status"], _count: true }),
    ]);
    content = (
      <>
        <Card>
          <h2 className="text-2xl">Net collected</h2>
          <p className="mt-3 text-3xl">
            {formatMoney(
              (payments._sum.amountCents ?? 0) -
                (payments._sum.refundedCents ?? 0),
            )}
          </p>
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl">Order status</h2>
          {orders.map((o) => (
            <p key={o.status}>
              {o.status}: {o._count}
            </p>
          ))}
        </Card>
        <Card>
          <h2 className="mb-4 text-2xl">Top products by paid units</h2>
          {products.map((p) => (
            <p key={p.id}>
              {p.name}: {p.soldCount}
            </p>
          ))}
        </Card>
      </>
    );
  } else {
    const rows = await db.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { email: true } } },
    });
    content = (
      <Card>
        <div className="overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.createdAt.toISOString()}</td>
                  <td>{r.admin?.email}</td>
                  <td>{r.action}</td>
                  <td>
                    {r.entity} {r.entityId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
  return (
    <>
      <h1 className="mb-6 text-3xl capitalize">{section}</h1>
      {section === "content" && <AdminSections />}
      {section === "admins" && <AdminPermissions />}
      {content}
    </>
  );
}
