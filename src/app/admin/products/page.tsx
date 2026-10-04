import { AdminVariants } from "@/components/admin-variants";
import { ImageUpload } from "@/components/image-upload";
import { storageConfigured } from "@/lib/storage";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { AdminProductForm } from "@/components/admin-product-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requirePermission("products.manage");
  const q = await searchParams;
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, status: true, priceCents: true },
  });
  return (
    <>
      <h1 className="mb-6 text-3xl">Products</h1>
      <div className="card mb-6 overflow-auto p-4">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Price</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.status}</td>
                <td>{formatMoney(p.priceCents)}</td>
                <td>
                  <Link className="underline" href={`?edit=${p.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {storageConfigured() ? (
        <ImageUpload />
      ) : (
        <p className="mb-5">
          Paste HTTPS image URLs below, or configure an image bucket to enable
          uploads.
        </p>
      )}
      <div className="card p-6">
        <h2 className="mb-5 text-2xl">
          {q.edit ? "Edit product" : "Add product"}
        </h2>
        <AdminProductForm key={q.edit ?? "new"} id={q.edit} />
        {q.edit && (
          <Link className="mt-4 inline-block underline" href="/admin/products">
            Add a new product instead
          </Link>
        )}
      </div>
      {q.edit && <AdminVariants productId={q.edit} />}
    </>
  );
}
