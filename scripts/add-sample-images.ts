import { PrismaClient } from "@prisma/client";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  demoSlug,
  isPlaceholderImage,
  sampleCategoryImages,
  sampleProductImages,
} from "../src/data/sample-images";

const db = new PrismaClient();
async function main() {
  // Validate the complete asset set before making any database changes.
  for (const url of new Set([
    ...Object.values(sampleProductImages),
    ...Object.values(sampleCategoryImages),
  ])) {
    await access(resolve("public", url.slice(1)));
  }
  let products = 0;
  let categories = 0;
  await db.$transaction(
    async (tx) => {
      for (const [name, url] of Object.entries(sampleProductImages)) {
        const product = await tx.product.findUnique({
          where: { slug: demoSlug(name) },
          include: { images: true },
        });
        if (!product) continue;
        // Preserve any genuine images already uploaded by the store owner.
        if (product.images.some((image) => !isPlaceholderImage(image.url)))
          continue;
        await tx.productImage.deleteMany({
          where: {
            productId: product.id,
            id: { in: product.images.map((i) => i.id) },
          },
        });
        await tx.productImage.create({
          data: {
            productId: product.id,
            url,
            alt: `${name} — representative sample photo`,
            sortOrder: 0,
            isThumbnail: true,
          },
        });
        products++;
      }
      for (const [name, url] of Object.entries(sampleCategoryImages)) {
        const category = await tx.category.findUnique({
          where: { slug: demoSlug(name) },
        });
        if (category && isPlaceholderImage(category.imageUrl)) {
          await tx.category.update({
            where: { id: category.id },
            data: { imageUrl: url },
          });
          categories++;
        }
      }
      await tx.banner.updateMany({
        where: {
          title: "Authentic Nepal, Delivered to Your Door",
          imageUrl: { startsWith: "https://placehold.co/" },
        },
        data: { imageUrl: "/images/demo/chicken-momo.jpg" },
      });
    },
    { timeout: 30000 },
  );
  console.info(
    `Sample photos added: ${products} products, ${categories} categories. Existing custom photos were preserved.`,
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
