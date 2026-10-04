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
export function ProductGrid({ products }: { products: CardProduct[] }) {
  return products.length ? (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {products.map((p) => {
        const price = Math.min(
          ...p.variants.map((v) => v.salePriceCents ?? v.priceCents),
        );
        return (
          <Link
            href={`/product/${p.slug}`}
            key={p.id}
            className="card overflow-hidden transition-transform hover:-translate-y-1"
          >
            {p.images[0] ? (
              <img
                src={p.images[0].url}
                alt={p.images[0].alt}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="flex aspect-square items-center justify-center bg-mist text-5xl"
                aria-hidden="true"
              >
                🇳🇵
              </div>
            )}
            <div className="p-4">
              <h2 className="text-lg">{p.name}</h2>
              <p className="mt-2 font-bold text-burgundy">
                {Number.isFinite(price) ? formatMoney(price) : "Unavailable"}
              </p>
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
  return (
    <>
      <form className="mb-8 grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-4">
        <input
          name="q"
          aria-label="Search products"
          defaultValue={query.q}
          placeholder="Search momo, spices, groceries…"
          className="input"
        />
        <select
          name="category"
          aria-label="Category"
          defaultValue={query.category}
          className="input"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          aria-label="Sort"
          defaultValue={query.sort}
          className="input"
        >
          <option value="new">Newest</option>
          <option value="price">Price: low to high</option>
          <option value="popular">Most popular</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>
      <p className="mb-4 text-sm">{total} products</p>
      <ProductGrid products={products} />
      <nav className="mt-8 flex gap-6" aria-label="Pagination">
        {page > 1 && <Link href={url(page - 1)}>← Previous</Link>}
        {page * 12 < total && <Link href={url(page + 1)}>Next →</Link>}
      </nav>
    </>
  );
}
