import { db } from "@/lib/db";
import { ActionForm } from "./action-form";
import { Field } from "./ui";
import { saveSection } from "@/app/admin/actions";
export async function AdminSections() {
  const rows = await db.homepageSection.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return (
    <>
      <h2 className="mb-4 text-2xl">Homepage sections</h2>
      {[...rows, null].map((s) => {
        const config = s?.config as
          { limit?: number; categorySlug?: string } | undefined;
        return (
          <details className="card mb-4 p-5" key={s?.id ?? "new"}>
            <summary>
              {s
                ? `${s.sortOrder}. ${s.type}${s.isActive ? "" : " (hidden)"}`
                : "Add homepage section"}
            </summary>
            <ActionForm className="mt-4 space-y-3" action={saveSection}>
              <input name="id" type="hidden" value={s?.id ?? ""} />
              <label>
                Type
                <select name="type" className="input" defaultValue={s?.type}>
                  {[
                    "FEATURED_CATEGORIES",
                    "BEST_SELLERS",
                    "NEW_ARRIVALS",
                    "READY_TO_EAT",
                    "PRODUCT_GRID",
                    "WHY_US",
                    "PROMO",
                    "TESTIMONIALS",
                    "NEWSLETTER",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <Field name="title" label="Title" value={s?.title ?? ""} />
              <Field
                name="subtitle"
                label="Subtitle"
                value={s?.subtitle ?? ""}
              />
              <Field
                name="sortOrder"
                label="Display order"
                type="number"
                value={s?.sortOrder ?? rows.length}
              />
              <Field
                name="limit"
                label="Maximum products / categories (1–24)"
                type="number"
                value={config?.limit ?? 8}
              />
              <Field
                name="categorySlug"
                label="Category slug for custom product grid (optional)"
                value={config?.categorySlug ?? ""}
              />
              <label>
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={s?.isActive ?? true}
                />{" "}
                Active
              </label>
            </ActionForm>
          </details>
        );
      })}
    </>
  );
}
