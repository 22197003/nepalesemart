import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Shell } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { addToCart, toggleWishlist } from "@/app/shop-actions";
import { formatMoney } from "@/lib/utils";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await db.product.findFirst({
    where: { slug, status: "ACTIVE", category: { isActive: true } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      ingredients: true,
      allergens: true,
      storageInstructions: true,
      countryOfOrigin: true,
      storageType: true,
      images: {
        orderBy: { sortOrder: "asc" },
        select: { url: true, alt: true },
      },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          priceCents: true,
          salePriceCents: true,
          stockQty: true,
        },
      },
      reviews: {
        where: { status: "APPROVED" },
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          body: true,
          rating: true,
          user: { select: { firstName: true } },
        },
      },
    },
  });
  if (!p) notFound();
  const available = p.variants.filter((v) => v.stockQty > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images.map((i) => i.url),
    description: p.shortDescription,
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      priceCurrency: "AUD",
      price: ((v.salePriceCents ?? v.priceCents) / 100).toFixed(2),
      availability: `https://schema.org/${v.stockQty > 0 ? "InStock" : "OutOfStock"}`,
    })),
  };
  return (
    <Shell title={p.name}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\u003c"),
        }}
      />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="grid gap-3">
          {p.images.map((i) => (
            <img
              key={i.url}
              src={i.url}
              alt={i.alt}
              className="w-full rounded-xl"
            />
          ))}
        </div>
        <div className="card space-y-5 p-6">
          <p>{p.shortDescription}</p>
          {available.length ? (
            <ActionForm action={addToCart} label="Add to cart">
              <label className="block">
                Size / variant
                <select className="input" name="variantId">
                  {available.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {formatMoney(v.salePriceCents ?? v.priceCents)}{" "}
                      ({v.stockQty} available)
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Quantity
                <input
                  className="input"
                  type="number"
                  name="quantity"
                  defaultValue="1"
                  min="1"
                  max="99"
                  required
                />
              </label>
            </ActionForm>
          ) : (
            <p>Out of stock</p>
          )}
          <ActionForm action={toggleWishlist} label="Save / remove wishlist">
            <input type="hidden" name="productId" value={p.id} />
          </ActionForm>
          <p className="whitespace-pre-line">{p.description}</p>
          {p.ingredients && (
            <p>
              <strong>Ingredients:</strong> {p.ingredients}
            </p>
          )}
          {p.allergens.length > 0 && (
            <p>
              <strong>Allergens:</strong> {p.allergens.join(", ")}
            </p>
          )}
          <p>
            <strong>Storage:</strong> {p.storageInstructions ?? p.storageType}
          </p>
          {p.countryOfOrigin && <p>Country of origin: {p.countryOfOrigin}</p>}
        </div>
      </div>
      <h2 className="mt-12 text-2xl">Verified purchase reviews</h2>
      {p.reviews.length ? (
        p.reviews.map((r) => (
          <article className="card mt-4 p-5" key={r.id}>
            <p>
              {r.rating}/5 · {r.user.firstName}
            </p>
            <h3 className="text-xl">{r.title}</h3>
            <p>{r.body}</p>
          </article>
        ))
      ) : (
        <p className="mt-4">No approved reviews yet.</p>
      )}
    </Shell>
  );
}
