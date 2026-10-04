import { Shell } from "@/components/ui";
import { Catalog } from "@/components/catalog";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Shell
      title="A little closer to home."
      description="Discover Nepali pantry favourites, comforting flavours and everyday essentials."
      eyebrow="The collection"
    >
      <Catalog query={await searchParams} />
    </Shell>
  );
}
