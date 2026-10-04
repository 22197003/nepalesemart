ALTER TABLE "Order" ADD COLUMN "sourceCartId" TEXT;
ALTER TABLE "Order" ADD COLUMN "checkoutKey" TEXT;
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
ALTER TYPE "NotificationStatus" ADD VALUE 'PROCESSING';
ALTER TABLE "Notification" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
