import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/ui";
import { saveDelivery, saveZone, saveMethod, addRate } from "../actions";
export default async function Page() {
  await requirePermission("delivery.manage");
  const [zones, methods, rates] = await Promise.all([
    db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }),
    db.shippingMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    db.shippingRate.findMany({ include: { zone: true, method: true } }),
  ]);
  return (
    <>
      <h1 className="mb-6 text-3xl">Delivery</h1>
      <p className="mb-5">
        Cold delivery destinations are controlled in Settings. Prices below are
        in cents.
      </p>
      <h2 className="mb-4 text-2xl">Rates</h2>
      {rates.map((r) => (
        <details className="card mb-4 p-5" key={r.id}>
          <summary>
            {r.zone.name} / {r.method.name}
          </summary>
          <ActionForm className="mt-4 space-y-3" action={saveDelivery}>
            <input name="id" type="hidden" value={r.id} />
            <Field
              name="priceCents"
              label="Charge (cents)"
              type="number"
              value={r.priceCents}
            />
            <Field
              name="freeThresholdCents"
              label="Free delivery threshold (blank disables)"
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
              label="Maximum weight (grams, optional)"
              type="number"
              value={r.maxWeightGrams ?? ""}
            />
            <label>
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={r.isActive}
              />{" "}
              Active
            </label>
          </ActionForm>
        </details>
      ))}
      <details className="card mb-5 p-5">
        <summary>Add / replace rate</summary>
        <ActionForm action={addRate}>
          <label>
            Zone
            <select name="zoneId" className="input">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Method
            <select name="methodId" className="input">
              {methods
                .filter((m) => m.type === "DELIVERY")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <Field
            name="priceCents"
            label="Charge (cents)"
            type="number"
            required
          />
        </ActionForm>
      </details>
      <h2 className="mb-4 text-2xl">Delivery zones</h2>
      {[...zones, null].map((z) => (
        <details className="card mb-4 p-5" key={z?.id ?? "new"}>
          <summary>{z?.name ?? "Add zone"}</summary>
          <ActionForm className="mt-4 space-y-3" action={saveZone}>
            <input name="id" type="hidden" value={z?.id ?? ""} />
            <Field name="name" label="Name" value={z?.name} required />
            <Field
              name="states"
              label="States (comma separated)"
              value={z?.states.join(", ")}
            />
            <Field
              name="postcodes"
              label="Postcodes / ranges (comma separated)"
              value={z?.postcodes.join(", ")}
            />
            <Field
              name="sortOrder"
              label="Priority (lower first)"
              type="number"
              value={z?.sortOrder ?? 0}
            />
            <label>
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={z?.isActive ?? true}
              />{" "}
              Active
            </label>
          </ActionForm>
        </details>
      ))}
      <h2 className="mb-4 text-2xl">Methods and pickup</h2>
      {[...methods, null].map((m) => (
        <details className="card mb-4 p-5" key={m?.id ?? "new"}>
          <summary>{m?.name ?? "Add method"}</summary>
          <ActionForm className="mt-4 space-y-3" action={saveMethod}>
            <input name="id" type="hidden" value={m?.id ?? ""} />
            <Field
              name="code"
              label="Code (lowercase letters, numbers, hyphens)"
              value={m?.code}
              required
            />
            <Field name="name" label="Name" value={m?.name} required />
            <Field
              name="description"
              label="Description / pickup instructions"
              value={m?.description ?? ""}
            />
            <label>
              Type
              <select name="type" className="input" defaultValue={m?.type}>
                <option>DELIVERY</option>
                <option>PICKUP</option>
              </select>
            </label>
            <Field
              name="minDays"
              label="Minimum days"
              type="number"
              value={m?.minDays ?? 0}
            />
            <Field
              name="maxDays"
              label="Maximum days"
              type="number"
              value={m?.maxDays ?? 0}
            />
            <label>
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={m?.isActive ?? true}
              />{" "}
              Active
            </label>
          </ActionForm>
        </details>
      ))}
    </>
  );
}
