import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell, Field } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import {
  saveProfile,
  saveAddress,
  deleteAddress,
  submitReview,
} from "./actions";
import { sendVerification, logout } from "../auth-actions";
import { formatMoney } from "@/lib/utils";
import { AU_STATES } from "@/validation/checkout";
export default async function Page() {
  const s = await requireUser();
  const [user, orders] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: s.userId },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        emailVerified: true,
        addresses: true,
      },
    }),
    db.order.findMany({
      where: { userId: s.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    }),
  ]);
  return (
    <Shell
      title={`Welcome, ${user.firstName}`}
      description="Your favourites, deliveries and details. All feeling a little more like home."
      eyebrow="Your account"
    >
      {!user.emailVerified && (
        <div className="mb-6 rounded-2xl border border-gold/30 bg-gold-light/40 p-5">
          <ActionForm action={sendVerification} label="Send verification email">
            <p>Your email address is not verified yet.</p>
          </ActionForm>
        </div>
      )}
      <div className="mb-6 flex gap-4">
        {s.role !== "CUSTOMER" && (
          <Link className="btn-secondary" href="/admin">
            Admin dashboard
          </Link>
        )}
        <form action={logout}>
          <button className="btn-secondary">Sign out</button>
        </form>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-2xl">Your details</h2>
          <ActionForm action={saveProfile}>
            <Field
              name="firstName"
              label="First name"
              value={user.firstName}
              required
            />
            <Field
              name="lastName"
              label="Last name"
              value={user.lastName}
              required
            />
            <Field name="phone" label="Phone" value={user.phone ?? ""} />
          </ActionForm>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-2xl">Saved addresses</h2>
          {user.addresses.map((a) => (
            <div
              className="mb-4 rounded-xl border border-night/10 bg-cream p-4"
              key={a.id}
            >
              <p>
                {a.label}: {a.line1}, {a.suburb} {a.state} {a.postcode}
              </p>
              <ActionForm action={deleteAddress} label="Remove">
                <input type="hidden" name="id" value={a.id} />
              </ActionForm>
            </div>
          ))}
          <details>
            <summary className="cursor-pointer underline">Add address</summary>
            <ActionForm className="mt-4 space-y-3" action={saveAddress}>
              <Field name="label" label="Label" />
              <Field name="line1" label="Address line 1" required />
              <Field name="line2" label="Address line 2" />
              <Field name="suburb" label="Suburb" required />
              <label>
                State
                <select name="state" className="input">
                  {AU_STATES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <Field name="postcode" label="Postcode" required />
            </ActionForm>
          </details>
        </div>
      </div>
      <h2 className="mb-5 mt-10 text-3xl">Your orders</h2>
      <div className="space-y-4">
        {orders.length ? (
          orders.map((o) => (
            <div className="card p-5" key={o.id}>
              <Link
                className="text-xl underline"
                href={`/account/orders/${o.id}`}
              >
                {o.orderNumber}
              </Link>
              <p>
                {o.status} · {o.paymentStatus} · {formatMoney(o.totalCents)}
              </p>
              {o.status === "DELIVERED" &&
                o.items
                  .filter((i) => i.productId)
                  .map((i) => (
                    <details key={i.id} className="mt-3">
                      <summary className="cursor-pointer">
                        Review {i.name}
                      </summary>
                      <ActionForm
                        className="mt-3 space-y-3"
                        action={submitReview}
                        label="Submit review"
                      >
                        <input type="hidden" name="orderId" value={o.id} />
                        <input
                          type="hidden"
                          name="productId"
                          value={i.productId!}
                        />
                        <label>
                          Rating
                          <select className="input" name="rating">
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </label>
                        <Field name="title" label="Review title" required />
                        <label>
                          Review
                          <textarea
                            className="input"
                            name="body"
                            required
                            minLength={10}
                            maxLength={2000}
                          />
                        </label>
                      </ActionForm>
                    </details>
                  ))}
            </div>
          ))
        ) : (
          <p>You haven't placed an order yet.</p>
        )}
      </div>
    </Shell>
  );
}
