import type { Role } from "@prisma/client";

export const PERMISSIONS = [
  "dashboard.view",
  "products.manage",
  "categories.manage",
  "orders.manage",
  "customers.manage",
  "reviews.manage",
  "coupons.manage",
  "inventory.manage",
  "delivery.manage",
  "payments.manage",
  "analytics.view",
  "banners.manage",
  "content.manage",
  "settings.manage",
  "admins.manage",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Code defaults. Rows in RolePermission (admin → Admins → Roles) override these at runtime. */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  CUSTOMER: [],
  STAFF: ["dashboard.view", "orders.manage", "inventory.manage"],
  ADMIN: [
    "dashboard.view",
    "products.manage",
    "categories.manage",
    "orders.manage",
    "customers.manage",
    "reviews.manage",
    "coupons.manage",
    "inventory.manage",
    "analytics.view",
    "banners.manage",
    "content.manage",
    "delivery.manage",
  ],
  SUPER_ADMIN: PERMISSIONS,
};

export const isStaffRole = (r: Role) => r !== "CUSTOMER";

export function can(
  role: Role,
  perm: Permission,
  overrides?: readonly Permission[] | null,
): boolean {
  if (role === "SUPER_ADMIN") return true; // cannot be locked out
  const list = overrides ?? DEFAULT_ROLE_PERMISSIONS[role];
  return list.includes(perm);
}
