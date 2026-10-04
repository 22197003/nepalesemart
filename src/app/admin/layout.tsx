import Link from "next/link";
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
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[190px_1fr]">
      <aside className="card h-fit p-4">
        <h2 className="mb-4 text-2xl">Store admin</h2>
        <nav className="flex flex-wrap gap-2 md:flex-col" aria-label="Admin">
          {links
            .filter(([, , p]) =>
              can(
                s.role,
                p,
                overrides.length
                  ? overrides.map((r) => r.permission as Permission)
                  : null,
              ),
            )
            .map(([label, path]) => (
              <Link
                key={path}
                className="rounded-lg px-3 py-2 hover:bg-mist"
                href={`/admin/${path}`}
              >
                {label}
              </Link>
            ))}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
