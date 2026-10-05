import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { Empty } from "./ui";
export const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  images: {
    take: 1,
    orderBy: { sortOrder: "asc" as const },
    select: { url: true, alt: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: { priceCents: "asc" as const },
    select: { priceCents: true, salePriceCents: true, stockQty: true },
  },
};
export type CardProduct = Prisma.ProductGetPayload<{
  select: typeof productCardSelect;
}>;
export function ProductGrid({
  products,
  polished = false,
}: {
  products: CardProduct[];
  polished?: boolean;
}) {
  return products.length ? (
    <div
      className={
        polished
          ? "grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3"
          : "grid grid-cols-2 gap-4 md:grid-cols-4"
      }
    >
      {products.map((p) => {
        const price = Math.min(
          ...p.variants.map((v) => v.salePriceCents ?? v.priceCents),
        );
        return (
          <Link
            href={`/product/${p.slug}`}
            key={p.id}
            className={
              polished
                ? "card group flex flex-col overflow-hidden transition-colors hover:border-burgundy/40"
                : "card overflow-hidden transition-transform hover:-translate-y-1"
            }
          >
            {p.images[0] ? (
              <div className="relative overflow-hidden">
                <img
                  src={p.images[0].url}
                  alt={p.images[0].alt}
                  className={
                    polished
                      ? "aspect-square w-full bg-mist/30 object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                      : "aspect-square w-full object-cover"
                  }
                  loading="lazy"
                />
                {p.images[0].url.startsWith("/images/demo/") && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-night">
                    Sample photo
                  </span>
                )}
              </div>
            ) : (
              <div
                className="flex aspect-square items-center justify-center bg-mist text-5xl"
                aria-hidden="true"
              >
                {polished ? (
                  <svg
                    viewBox="0 0 48 48"
                    className="h-14 w-14 text-glacier"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="m8 16 16-8 16 8v20l-16 8-16-8Z" />
                    <path d="m8 16 16 8 16-8M24 24v20M16 12l16 8v9" />
                  </svg>
                ) : (
                  "🇳🇵"
                )}
              </div>
            )}
            <div
              className={polished ? "flex flex-1 flex-col p-4 sm:p-5" : "p-4"}
            >
              <h2
                className={
                  polished
                    ? "font-sans text-base font-bold leading-snug sm:text-lg"
                    : "text-lg"
                }
              >
                {p.name}
              </h2>
              {polished && (
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-night/60">
                  {p.shortDescription}
                </p>
              )}
              <p className="mt-2 font-bold text-burgundy">
                {p.variants.length > 1 && polished && (
                  <span className="mr-1 text-xs font-normal text-night/60">
                    From
                  </span>
                )}
                {Number.isFinite(price) ? formatMoney(price) : "Unavailable"}
              </p>
              {polished && (
                <span className="mt-auto pt-4 text-xs font-bold text-night/60">
                  View product <span aria-hidden="true">↗</span>
                </span>
              )}
              {!p.variants.some((v) => v.stockQty > 0) && (
                <p className="text-sm">Out of stock</p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  ) : (
    <Empty text="No products match your search." />
  );
}
export async function Catalog({
  query,
  category,
}: {
  query: Record<string, string>;
  category?: string;
}) {
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page || "1") || 1),
  );
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    category: { isActive: true },
    variants: { some: { isActive: true } },
  };
  if (category)
    where.OR = [
      { category: { slug: category } },
      { subcategory: { slug: category } },
    ];
  if (query.q)
    where.AND = [
      {
        OR: [
          { name: { contains: query.q.slice(0, 120), mode: "insensitive" } },
          {
            description: {
              contains: query.q.slice(0, 120),
              mode: "insensitive",
            },
          },
        ],
      },
    ];
  if (query.category) where.categoryId = query.category;
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price"
      ? { priceCents: "asc" }
      : query.sort === "popular"
        ? { soldCount: "desc" }
        : { createdAt: "desc" };
  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      select: productCardSelect,
      skip: (page - 1) * 12,
      take: 12,
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const url = (n: number) =>
    `?${new URLSearchParams({ ...query, page: String(n) })}`;
  const hasFilters = Boolean(
    query.q || query.category || (query.sort && query.sort !== "new"),
  );
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="card p-5 lg:sticky lg:top-28">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-sans text-lg font-bold">Find your favourites</h2>
          {hasFilters && (
            <Link
              href="?"
              className="text-sm font-bold text-burgundy underline"
            >
              Reset
            </Link>
          )}
        </div>
        <form className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <label className="space-y-2 text-sm font-bold">
            Search products
            <input
              name="q"
              defaultValue={query.q}
              placeholder="Momo, spices, groceries…"
              className="input font-normal"
            />
          </label>
          {!category && (
            <label className="space-y-2 text-sm font-bold">
              Category
              <select
                name="category"
                defaultValue={query.category}
                className="input font-normal"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="space-y-2 text-sm font-bold">
            Sort by
            <select
              name="sort"
              defaultValue={query.sort}
              className="input font-normal"
            >
              <option value="new">Newest arrivals</option>
              <option value="price">Price: low to high</option>
              <option value="popular">Most popular</option>
            </select>
          </label>
          <button className="btn-primary self-end">Search</button>
        </form>
        <div className="mt-6 hidden border-t border-night/10 pt-5 text-sm leading-relaxed text-night/60 lg:block">
          <p className="mb-1 font-bold text-night">
            From our store to your door
          </p>
          <p>Check delivery options for your postcode at checkout.</p>
          <Link
            href="/info/delivery-policy"
            className="mt-3 inline-block font-bold text-burgundy"
          >
            Delivery information →
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-night/60">
            <strong className="text-night">{total}</strong>{" "}
            {total === 1 ? "product" : "products"}
            {query.q && <> matching “{query.q}”</>}
          </p>
          <span className="text-xs font-bold uppercase tracking-widest text-night/50">
            Prices in AUD
          </span>
        </div>
        <ProductGrid products={products} polished />
        {total > 12 && (
          <nav
            className="mt-8 flex items-center justify-between gap-4 border-t border-night/10 pt-6"
            aria-label="Pagination"
          >
            {page > 1 ? (
              <Link className="btn-secondary" href={url(page - 1)}>
                ← Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-night/60">
              Page {page} of {Math.ceil(total / 12)}
            </span>
            {page * 12 < total ? (
              <Link className="btn-secondary" href={url(page + 1)}>
                Next →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
