import Link from "next/link";
import { db } from "@/lib/db";
import { getCart } from "@/services/cart";
import { priceCart } from "@/services/pricing";
import { Shell, Empty } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { updateCart, saveCoupon } from "@/app/shop-actions";
import { formatMoney } from "@/lib/utils";
export default async function Page() {
  const cart = await getCart();
  if (!cart?.items.length)
    return (
      <Shell
        title="Your cart"
        description="A few favourites, ready for your home."
        eyebrow="Your selection"
      >
        <Empty text="Your cart is empty." />
      </Shell>
    );
  const [priced, items] = await Promise.all([
    priceCart({
      items: cart.items,
      couponCode: cart.couponCode ?? undefined,
      userId: cart.userId,
    }),
    db.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        variant: {
          include: {
            product: {
              select: {
                name: true,
                slug: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: "asc" },
                  select: { url: true, alt: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);
  return (
    <Shell
      title="Your cart"
      description="A few favourites, ready for your home."
      eyebrow="Your selection"
    >
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {items.map((i) => (
            <article className="card flex gap-4 p-4 sm:gap-6 sm:p-6" key={i.id}>
              <Link
                href={`/product/${i.variant.product.slug}`}
                className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-mist/40 sm:h-32 sm:w-28"
                aria-label={`View ${i.variant.product.name}`}
              >
                {i.variant.product.images[0] && (
                  <img
                    src={i.variant.product.images[0].url}
                    alt={i.variant.product.images[0].alt}
                    className="h-full w-full object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  className="text-lg font-bold hover:text-burgundy"
                  href={`/product/${i.variant.product.slug}`}
                >
                  {i.variant.product.name}
                </Link>
                <p className="mt-1 text-sm text-night/60">
                  {i.variant.name} ·{" "}
                  {formatMoney(
                    i.variant.salePriceCents ?? i.variant.priceCents,
                  )}
                </p>
                <ActionForm
                  className="mt-3 flex flex-wrap items-center gap-3"
                  action={updateCart}
                  label="Update"
                >
                  <input type="hidden" name="itemId" value={i.id} />
                  <label>
                    Quantity (0 removes)
                    <input
                      className="input w-24"
                      type="number"
                      name="quantity"
                      min="0"
                      max="99"
                      defaultValue={i.quantity}
                    />
                  </label>
                </ActionForm>
              </div>
            </article>
          ))}
        </div>
        <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28">
          <h2 className="text-2xl">Order summary</h2>
          <div className="flex justify-between">
            <span>Subtotal</span>
            <strong>{formatMoney(priced.subtotalCents)}</strong>
          </div>
          <div className="flex justify-between text-night/60">
            <span>Discount</span>
            <span>−{formatMoney(priced.discountCents)}</span>
          </div>
          <p>Delivery and final GST are calculated at checkout.</p>
          {priced.issues.map((i) => (
            <p key={i} role="alert" className="text-red-800">
              {i}
            </p>
          ))}
          {priced.couponError && <p role="alert">{priced.couponError}</p>}
          <ActionForm action={saveCoupon} label="Apply coupon">
            <label>
              Coupon
              <input
                className="input"
                name="couponCode"
                defaultValue={cart.couponCode ?? ""}
              />
            </label>
          </ActionForm>
          <Link className="btn-primary w-full" href="/checkout">
            Checkout
          </Link>
          <p className="text-center text-sm text-night/60">
            Guest checkout is available.
          </p>
          <Link
            className="block text-center text-sm font-bold text-night/60"
            href="/shop"
          >
            ← Continue shopping
          </Link>
        </aside>
      </div>
    </Shell>
  );
}
