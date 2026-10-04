"use client";
import { useState } from "react";
import { ActionForm } from "./action-form";
import { checkout } from "@/app/checkout/actions";
import { AU_STATES } from "@/validation/checkout";
export function CheckoutForm({
  methods,
  user,
  checkoutKey,
}: {
  methods: { code: string; name: string; type: string }[];
  user?: { firstName: string; lastName: string; email: string };
  checkoutKey: string;
}) {
  const [selected, setSelected] = useState(methods[0]?.code ?? "");
  const pickup = methods.find((m) => m.code === selected)?.type === "PICKUP";
  const fields = [
    ["firstName", "First name", "text", user?.firstName],
    ["lastName", "Last name", "text", user?.lastName],
    ["email", "Email", "email", user?.email],
    ["phone", "Phone", "tel", ""],
  ] as const;
  return (
    <ActionForm action={checkout} label="Review total and continue to payment">
      <input type="hidden" name="checkoutKey" value={checkoutKey} />
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([name, label, type, value]) => (
          <label key={name}>
            {label}
            <input
              className="input"
              name={name}
              type={type}
              defaultValue={value}
              required
            />
          </label>
        ))}
      </div>
      <label className="block">
        Delivery method
        <select
          className="input"
          name="shippingMethodCode"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          required
        >
          {methods.map((m) => (
            <option value={m.code} key={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      {!pickup && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["line1", "Address line 1"],
            ["line2", "Address line 2"],
            ["suburb", "Suburb"],
            ["postcode", "Postcode"],
          ].map(([name, label]) => (
            <label key={name}>
              {label}
              <input
                className="input"
                name={name}
                required={name !== "line2"}
              />
            </label>
          ))}
          <label>
            State
            <select className="input" name="state" defaultValue="VIC">
              {AU_STATES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="text-sm">
        Delivery availability and cost are checked before payment.
      </p>
      <label className="block">
        Order notes
        <textarea className="input" name="customerNotes" maxLength={500} />
      </label>
    </ActionForm>
  );
}
