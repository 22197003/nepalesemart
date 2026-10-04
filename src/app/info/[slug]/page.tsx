import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Shell } from "@/components/ui";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (
    ![
      "about",
      "faq",
      "delivery-policy",
      "returns",
      "privacy",
      "terms",
    ].includes(slug)
  )
    notFound();
  const row = await db.siteSetting.findUnique({ where: { key: slug } });
  const page = row?.value as { title?: string; body?: string } | undefined;
  return (
    <Shell title={page?.title ?? slug.replace(/-/g, " ")}>
      <div className="card whitespace-pre-line p-6">
        {page?.body ||
          "The store is preparing this page. Please contact support for details."}
      </div>
    </Shell>
  );
}
