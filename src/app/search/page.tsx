import { Shell } from "@/components/ui";
import { Catalog } from "@/components/catalog";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return (
    <Shell title="Search products">
      <Catalog query={await searchParams} />
    </Shell>
  );
}
