import { randomUUID } from "node:crypto";
import { Shell, Empty } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout-form";
import { getCart } from "@/services/cart";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
export default async function Page() {
  const cart = await getCart();
  if (!cart?.items.length)
    return (
      <Shell title="Checkout">
        <Empty text="Add products before checking out." />
      </Shell>
    );
  const s = await getSession();
  const methods = await db.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { code: true, name: true, type: true },
  });
  return (
    <Shell title="Delivery details">
      <div className="card max-w-2xl p-6">
        <p className="mb-5">
          1. Delivery details → 2. Review total and pay → 3. Confirmation
        </p>
        <CheckoutForm
          methods={methods}
          user={s?.user}
          checkoutKey={randomUUID()}
        />
      </div>
    </Shell>
  );
}
