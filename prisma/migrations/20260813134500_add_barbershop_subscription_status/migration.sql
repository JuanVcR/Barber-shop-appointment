CREATE TYPE "BarbershopSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "Barbershop"
ADD COLUMN "subscriptionStatus" "BarbershopSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "subscriptionCancelledAt" TIMESTAMP(3);
