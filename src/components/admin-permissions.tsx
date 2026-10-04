import { db } from "@/lib/db";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/rbac";
import { ActionForm } from "./action-form";
import { savePermissions } from "@/app/admin/actions";
export async function AdminPermissions() {
  const rows = await db.rolePermission.findMany();
  return (
    <>
      <h2 className="mb-4 text-2xl">Role permissions</h2>
      {(["STAFF", "ADMIN"] as const).map((role) => {
        const saved = rows
          .filter((r) => r.role === role)
          .map((r) => r.permission);
        const list = saved.length ? saved : DEFAULT_ROLE_PERMISSIONS[role];
        return (
          <div className="card mb-5 p-5" key={role}>
            <h3 className="mb-4 text-xl">{role}</h3>
            <ActionForm action={savePermissions}>
              <input type="hidden" name="role" value={role} />
              <div className="grid gap-3 sm:grid-cols-2">
                {PERMISSIONS.filter((p) => p !== "dashboard.view").map((p) => (
                  <label key={p}>
                    <input
                      name="permissions"
                      type="checkbox"
                      value={p}
                      defaultChecked={(list as readonly string[]).includes(p)}
                    />{" "}
                    {p}
                  </label>
                ))}
              </div>
              <p className="text-sm">
                Dashboard access is always included. Grant admin-management
                permission only to trusted owners.
              </p>
            </ActionForm>
          </div>
        );
      })}
    </>
  );
}
