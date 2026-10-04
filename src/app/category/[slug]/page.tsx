import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Shell } from "@/components/ui";
import { Catalog } from "@/components/catalog";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const category = await db.category.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });
  if (!category) notFound();
  return (
    <Shell title={category.name}>
      <p className="mb-4">{category.description}</p>
      <Catalog category={slug} query={await searchParams} />
    </Shell>
  );
}
