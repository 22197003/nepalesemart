import { Shell } from "@/components/ui";
import { Catalog } from "@/components/catalog";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Shell
      title="Find your favourites."
      description="Looking for something from home? Explore our Nepali food and product collection."
      eyebrow="The collection"
    >
      <Catalog query={await searchParams} />
    </Shell>
  );
}
