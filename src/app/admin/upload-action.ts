"use server";
import { requirePermission } from "@/lib/auth";
import { getImageStorage } from "@/lib/storage";
import { z } from "zod";
export async function prepareImageUpload(data: {
  filename: string;
  contentType: string;
}) {
  await requirePermission("products.manage");
  const input = z
    .object({
      filename: z.string().min(1).max(200),
      contentType: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
      ]),
    })
    .parse(data);
  return getImageStorage().createUpload({ ...input, folder: "products" });
}
