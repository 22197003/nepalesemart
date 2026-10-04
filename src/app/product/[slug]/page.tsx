import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Shell } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { toggleWishlist } from "@/app/shop-actions";
import Link from "next/link";
import {
  ProductGallery,
  ProductPurchase,
} from "@/components/product-experience";
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
      <Link
        href="/shop"
        className="mb-6 inline-flex text-sm font-bold text-night/60 hover:text-burgundy"
      >
        ← Back to the collection
      </Link>
      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <ProductGallery images={p.images} name={p.name} />
        <div className="card form-panel p-6 sm:p-8">
          <p className="detail-label mb-3">A taste of home</p>
          <p className="mb-7 text-lg leading-relaxed text-night/65">
            {p.shortDescription}
          </p>
          <ProductPurchase variants={p.variants} />
          <div className="mt-3">
            <ActionForm
              action={toggleWishlist}
              label="Save / remove wishlist"
              secondary
            >
              <input type="hidden" name="productId" value={p.id} />
            </ActionForm>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-5 border-t border-night/10 pt-6 text-sm">
            <div>
              <p className="font-bold">Delivery options</p>
              <p className="mt-1 text-night/60">
                Calculated at checkout for your postcode.
              </p>
            </div>
            <div>
              <p className="font-bold">Storage</p>
              <p className="mt-1 text-night/60">
                {p.storageType.toLowerCase().replaceAll("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 grid gap-8 border-t border-night/10 pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <section>
          <p className="detail-label mb-3">The details</p>
          <h2 className="mb-4 text-3xl">About this product</h2>
          <p className="whitespace-pre-line leading-relaxed text-night/70">
            {p.description}
          </p>
        </section>
        <div className="divide-y divide-night/10 rounded-2xl border border-night/10 bg-white px-6">
          {p.ingredients && (
            <details className="py-5" open>
              <summary className="cursor-pointer font-bold">
                Ingredients
              </summary>
              <p className="mt-3 text-night/65">{p.ingredients}</p>
            </details>
          )}
          {p.allergens.length > 0 && (
            <details className="py-5" open>
              <summary className="cursor-pointer font-bold">
                Allergen information
              </summary>
              <p className="mt-3 text-night/65">{p.allergens.join(", ")}</p>
            </details>
          )}
          <details className="py-5">
            <summary className="cursor-pointer font-bold">
              Storage & origin
            </summary>
            <p className="mt-3 text-night/65">
              {p.storageInstructions ?? p.storageType}
            </p>
            {p.countryOfOrigin && (
              <p className="mt-2 text-night/65">
                Country of origin: {p.countryOfOrigin}
              </p>
            )}
          </details>
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
        <div className="card mt-5 p-8 text-center">
          <p className="font-bold">Be the first to share a little love.</p>
          <p className="mt-2 text-night/60">
            No reviews yet. Customers can leave a review after their order is
            delivered.
          </p>
        </div>
      )}
    </Shell>
  );
}
