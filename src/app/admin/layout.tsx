import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { requirePermission } from "@/lib/auth";
import { can, type Permission } from "@/lib/rbac";
import { db } from "@/lib/db";
const links: [[string, string, Permission], ...[string, string, Permission][]] =
  [
    ["Dashboard", "", "dashboard.view"],
    ["Products", "products", "products.manage"],
    ["Categories", "categories", "categories.manage"],
    ["Inventory", "inventory", "inventory.manage"],
    ["Orders", "orders", "orders.manage"],
    ["Customers", "customers", "customers.manage"],
    ["Reviews", "reviews", "reviews.manage"],
    ["Coupons", "coupons", "coupons.manage"],
    ["Delivery", "delivery", "delivery.manage"],
    ["Banners", "banners", "banners.manage"],
    ["Content", "content", "content.manage"],
    ["Settings", "settings", "settings.manage"],
    ["Analytics", "analytics", "analytics.view"],
    ["Payments", "payments", "payments.manage"],
    ["Admins", "admins", "admins.manage"],
    ["Audit log", "audit", "audit.view"],
  ];
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await requirePermission("dashboard.view");
  const overrides = await db.rolePermission.findMany({
    where: { role: s.role },
    select: { permission: true },
  });
  const permittedLinks = links
    .filter(([, , p]) =>
      can(
        s.role,
        p,
        overrides.length
          ? overrides.map((r) => r.permission as Permission)
          : null,
      ),
    )
    .map(([label, path]) => ({
      label,
      href: path ? `/admin/${path}` : "/admin",
    }));
  return (
    <div className="inner-page mx-auto grid max-w-7xl items-start gap-7 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl bg-night p-4 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <div className="mb-5 border-b border-white/15 px-3 pb-5 pt-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-light">
            Your workspace
          </p>
          <h2 className="mt-2 text-2xl text-white">Store admin</h2>
        </div>
        <AdminNav links={permittedLinks} />
        <Link
          href="/shop"
          className="mt-5 block border-t border-white/15 px-3 pt-5 text-sm text-white/70"
        >
          View storefront ↗
        </Link>
      </aside>
      <div className="min-w-0 admin-content">{children}</div>
    </div>
  );
}
