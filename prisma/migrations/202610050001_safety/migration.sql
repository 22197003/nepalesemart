ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "stockReleasedAt" TIMESTAMP(3);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_stock_nonnegative" CHECK ("stockQty" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_price_nonnegative" CHECK ("priceCents" >= 0 AND ("salePriceCents" IS NULL OR "salePriceCents" >= 0));
ALTER TABLE "CartItem" ADD CONSTRAINT "cart_quantity_positive" CHECK ("quantity" BETWEEN 1 AND 99);
ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
