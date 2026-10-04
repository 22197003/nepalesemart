import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Shell } from "@/components/ui";
import { ProductGrid, productCardSelect } from "@/components/catalog";
export default async function Page() {
  const s = await requireUser();
  const items = await db.wishlistItem.findMany({
    where: { wishlist: { userId: s.userId }, product: { status: "ACTIVE" } },
    select: { product: { select: productCardSelect } },
  });
  return (
    <Shell title="Your wishlist">
      <ProductGrid products={items.map((i) => i.product)} />
    </Shell>
  );
}
