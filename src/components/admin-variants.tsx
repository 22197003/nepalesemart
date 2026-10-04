import { db } from "@/lib/db";
import { ActionForm } from "./action-form";
import { Field } from "./ui";
import { saveVariant } from "@/app/admin/actions";
export async function AdminVariants({ productId }: { productId: string }) {
  const rows = await db.productVariant.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-2xl">Variants</h2>
      {[...rows, null].map((v) => (
        <details className="card mb-4 p-5" key={v?.id ?? "new"}>
          <summary className="cursor-pointer">
            {v ? `${v.name} (${v.stockQty} in stock)` : "Add variant"}
          </summary>
          <ActionForm className="mt-4 space-y-4" action={saveVariant}>
            <input type="hidden" name="id" value={v?.id ?? ""} />
            <input type="hidden" name="productId" value={productId} />
            <Field name="name" label="Variant name" value={v?.name} required />
            <Field name="sku" label="Variant SKU" value={v?.sku} required />
            <Field
              name="priceCents"
              label="Price (cents)"
              type="number"
              value={v?.priceCents}
              required
            />
            <Field
              name="salePriceCents"
              label="Sale price (cents)"
              type="number"
              value={v?.salePriceCents ?? ""}
            />
            <Field
              name="weightGrams"
              label="Weight (grams)"
              type="number"
              value={v?.weightGrams ?? 0}
            />
            {!v && (
              <Field
                name="stockQty"
                label="Initial stock"
                type="number"
                value={0}
              />
            )}
            <label>
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={v?.isActive ?? true}
              />{" "}
              Active
            </label>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
