CREATE TYPE "PlanPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED');

CREATE TABLE "PlanPayment" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "plan" "BarbershopPlan" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PlanPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'mercado_pago',
    "providerPaymentId" TEXT,
    "qrCode" TEXT,
    "qrCodeBase64" TEXT,
    "ticketUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanPayment_providerPaymentId_key" ON "PlanPayment"("providerPaymentId");
CREATE INDEX "PlanPayment_barbershopId_createdAt_idx" ON "PlanPayment"("barbershopId", "createdAt");
CREATE INDEX "PlanPayment_status_idx" ON "PlanPayment"("status");

ALTER TABLE "PlanPayment" ADD CONSTRAINT "PlanPayment_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
