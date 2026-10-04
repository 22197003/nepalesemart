import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MountainHero } from "@/components/storefront/mountain-hero";
import { ProductGrid, productCardSelect } from "@/components/catalog";
import { ActionForm } from "@/components/action-form";
import { newsletter } from "./shop-actions";
const colours = ["#1f5fae", "#8fa8c8", "#c8102e", "#2e8b57", "#e9a23b"];
const why = [
  [
    "Familiar favourites",
    "Discover the groceries, spices and flavours you grew up with.",
  ],
  [
    "Delivery options",
    "Enter your postcode at checkout to see available delivery methods.",
  ],
  ["Secure payments", "Stripe handles card details securely."],
  [
    "Careful packing",
    "Cold products are limited to supported delivery destinations.",
  ],
  ["Here to help", "Contact our team with product and order questions."],
];
const path = (s: string | null | undefined) =>
  s?.startsWith("/") && !s.startsWith("//") ? s : "/shop";
export default async function HomePage() {
  const now = new Date();
  const active = {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };
  const [hero, promo, sections] = await Promise.all([
    db.banner.findFirst({
      where: { ...active, placement: "HERO" },
      orderBy: { sortOrder: "asc" },
    }),
    db.banner.findFirst({
      where: { ...active, placement: "PROMO" },
      orderBy: { sortOrder: "asc" },
    }),
    db.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const rendered = await Promise.all(
    sections.map(async (section) => {
      const c = section.config as { limit?: number; categorySlug?: string };
      const limit = Math.max(1, Math.min(24, c.limit ?? 8));
      let content: React.ReactNode;
      if (section.type === "FEATURED_CATEGORIES") {
        const categories = await db.category.findMany({
          where: { isActive: true, isFeatured: true, parentId: null },
          orderBy: { sortOrder: "asc" },
          take: limit,
        });
        content = (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="card border-l-8 p-5 font-bold"
                style={{ borderColor: colours[i % 5] }}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        );
      } else if (
        [
          "BEST_SELLERS",
          "NEW_ARRIVALS",
          "READY_TO_EAT",
          "PRODUCT_GRID",
        ].includes(section.type)
      ) {
        const where: Prisma.ProductWhereInput = {
          status: "ACTIVE",
          category: { isActive: true },
        };
        if (section.type === "BEST_SELLERS") where.isBestseller = true;
        if (section.type === "NEW_ARRIVALS") where.isNewArrival = true;
        if (section.type === "READY_TO_EAT")
          where.category = { slug: "ready-to-eat", isActive: true };
        if (c.categorySlug)
          where.category = { slug: c.categorySlug, isActive: true };
        const products = await db.product.findMany({
          where,
          select: productCardSelect,
          orderBy:
            section.type === "BEST_SELLERS"
              ? { soldCount: "desc" }
              : { createdAt: "desc" },
          take: limit,
        });
        content = <ProductGrid products={products} />;
      } else if (section.type === "WHY_US")
        content = (
          <div className="grid gap-6 md:grid-cols-5">
            {why.map(([title, body], i) => (
              <div
                key={title}
                className="border-t-4 pt-4"
                style={{ borderColor: colours[i] }}
              >
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-sm">{body}</p>
              </div>
            ))}
          </div>
        );
      else if (section.type === "PROMO")
        content = (
          <div className="relative overflow-hidden rounded-xl bg-night p-8 text-white">
            <h3 className="text-3xl">
              {promo?.title ?? "Bring a little Nepal to your kitchen"}
            </h3>
            <p className="mt-3">
              {promo?.subtitle ??
                "Discover spices, pantry staples, snacks and gifts."}
            </p>
            <Link className="btn-light mt-6" href={path(promo?.ctaHref)}>
              {promo?.ctaLabel ?? "Explore the shop"}
            </Link>
          </div>
        );
      else if (section.type === "TESTIMONIALS") {
        const reviews = await db.review.findMany({
          where: { status: "APPROVED", isFeatured: true },
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            body: true,
            rating: true,
            user: { select: { firstName: true } },
          },
        });
        content = reviews.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r) => (
              <article className="card p-5" key={r.id}>
                <p>
                  {r.rating}/5 · {r.user.firstName}
                </p>
                <h3 className="my-2 text-xl">{r.title}</h3>
                <p>{r.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p>No featured reviews yet.</p>
        );
      } else if (section.type === "NEWSLETTER")
        content = (
          <div className="card p-6">
            <ActionForm action={newsletter} label="Subscribe">
              <label>
                Email
                <input
                  className="input mt-2 max-w-md"
                  type="email"
                  name="email"
                  required
                />
              </label>
              <p className="text-sm">
                Product news and offers. Ask support to unsubscribe at any time.
              </p>
            </ActionForm>
          </div>
        );
      else return null;
      return (
        <section key={section.id} className="mx-auto mt-12 max-w-7xl px-4">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl capitalize">
                {section.title || section.type.replace(/_/g, " ").toLowerCase()}
              </h2>
              {section.subtitle && <p className="mt-2">{section.subtitle}</p>}
            </div>
            {["BEST_SELLERS", "NEW_ARRIVALS", "PRODUCT_GRID"].includes(
              section.type,
            ) && (
              <Link
                className="whitespace-nowrap text-sm font-bold text-burgundy"
                href="/shop"
              >
                View all →
              </Link>
            )}
          </div>
          {content}
        </section>
      );
    }),
  );
  return (
    <>
      <MountainHero
        title={hero?.title ?? "Authentic Nepal, delivered to your door"}
        subtitle={
          hero?.subtitle ??
          "Nepali foods, groceries and cultural products in Australia."
        }
        ctaLabel={hero?.ctaLabel ?? "Shop now"}
        ctaHref={path(hero?.ctaHref)}
      />
      {sections.length ? (
        rendered
      ) : (
        <section className="mx-auto max-w-7xl p-8">
          <p>
            Our shop is being prepared. Browse the catalog for available
            products.
          </p>
          <Link className="btn-primary mt-4" href="/shop">
            Browse products
          </Link>
        </section>
      )}
    </>
  );
}
