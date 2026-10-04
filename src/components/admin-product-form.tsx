import { db } from "@/lib/db";
import { ActionForm } from "./action-form";
import { Field } from "./ui";
import { saveProduct } from "@/app/admin/actions";
export async function AdminProductForm({ id }: { id?: string }) {
  const [p, categories] = await Promise.all([
    id
      ? db.product.findUnique({
          where: { id },
          include: {
            variants: { orderBy: { sortOrder: "asc" } },
            images: { where: { isThumbnail: true }, take: 1 },
          },
        })
      : null,
    db.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const v = p?.variants[0];
  return (
    <ActionForm
      action={saveProduct}
      label={p ? "Save product" : "Create product"}
    >
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <input type="hidden" name="variantId" value={v?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Name" value={p?.name} required />
        <Field name="sku" label="SKU" value={p?.sku} required />
        <label>
          Category
          <select
            className="input"
            name="categoryId"
            defaultValue={p?.categoryId}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            className="input"
            name="status"
            defaultValue={p?.status ?? "DRAFT"}
          >
            {["DRAFT", "ACTIVE", "OUT_OF_STOCK", "ARCHIVED"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <Field
          name="priceCents"
          label="Regular price (cents, e.g. 1299 = $12.99)"
          type="number"
          value={v?.priceCents ?? p?.priceCents}
          required
        />
        <Field
          name="salePriceCents"
          label="Sale price (cents, optional)"
          type="number"
          value={v?.salePriceCents ?? ""}
        />
        <Field
          name="weightGrams"
          label="Weight (grams)"
          type="number"
          value={v?.weightGrams ?? p?.weightGrams ?? 0}
        />
        <label>
          Storage
          <select
            className="input"
            name="storageType"
            defaultValue={p?.storageType}
          >
            {["AMBIENT", "FROZEN", "REFRIGERATED"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        {!p && (
          <>
            <Field name="variantName" label="Variant / size" value="Default" />
            <Field
              name="stockQty"
              label="Initial stock"
              type="number"
              value={0}
            />
          </>
        )}
        <Field
          name="imageUrl"
          label="Thumbnail image HTTPS URL"
          value={p?.images[0]?.url ?? ""}
        />
        <Field
          name="shortDescription"
          label="Short description"
          value={p?.shortDescription ?? ""}
        />
        <Field
          name="ingredients"
          label="Ingredients"
          value={p?.ingredients ?? ""}
        />
        <Field
          name="allergens"
          label="Allergens (comma separated)"
          value={p?.allergens.join(", ") ?? ""}
        />
        <Field
          name="storageInstructions"
          label="Storage instructions"
          value={p?.storageInstructions ?? ""}
        />
      </div>
      <label>
        Description
        <textarea
          className="input"
          rows={5}
          name="description"
          defaultValue={p?.description ?? ""}
        />
      </label>
      <div className="flex flex-wrap gap-5">
        {[
          ["isTaxable", "Taxable", p?.isTaxable ?? true],
          [
            "shippingEligible",
            "Delivery eligible",
            p?.shippingEligible ?? true,
          ],
          ["isFeatured", "Featured", p?.isFeatured],
          ["isBestseller", "Bestseller", p?.isBestseller],
          ["isNewArrival", "New arrival", p?.isNewArrival],
        ].map(([name, label, checked]) => (
          <label key={String(name)}>
            <input
              type="checkbox"
              name={String(name)}
              defaultChecked={Boolean(checked)}
            />{" "}
            {label}
          </label>
        ))}
      </div>
      {p && (
        <p className="text-sm">
          This form edits the first variant price. Adjust stock on the Inventory
          page.
        </p>
      )}
    </ActionForm>
  );
}
