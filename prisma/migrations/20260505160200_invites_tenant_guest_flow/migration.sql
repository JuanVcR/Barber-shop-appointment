CREATE TYPE "BarbershopPlan" AS ENUM ('FREE', 'BASIC', 'PRO');

ALTER TABLE "Client" ALTER COLUMN "accountId" DROP NOT NULL;
ALTER TABLE "Client" ADD COLUMN "email" TEXT;

DROP INDEX IF EXISTS "Client_phone_key";
DROP INDEX IF EXISTS "Client_cpf_key";
CREATE INDEX IF NOT EXISTS "Client_phone_idx" ON "Client"("phone");
CREATE INDEX IF NOT EXISTS "Client_cpf_idx" ON "Client"("cpf");

ALTER TABLE "Barbershop" ADD COLUMN "cnpj" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "address" TEXT;
ALTER TABLE "Barbershop" ADD COLUMN "plan" "BarbershopPlan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Barbershop" ADD COLUMN "setupCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Barbershop" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Barbershop_cnpj_key" ON "Barbershop"("cnpj");

CREATE TABLE "BarberInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "invitedByAccountId" TEXT NOT NULL,
    "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarberInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarberInvite_token_key" ON "BarberInvite"("token");
CREATE INDEX "BarberInvite_barbershopId_idx" ON "BarberInvite"("barbershopId");
CREATE INDEX "BarberInvite_email_idx" ON "BarberInvite"("email");

ALTER TABLE "BarberInvite" ADD CONSTRAINT "BarberInvite_barbershopId_fkey"
FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BarberInvite" ADD CONSTRAINT "BarberInvite_invitedByAccountId_fkey"
FOREIGN KEY ("invitedByAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "BarberAvailability" (
    "id" TEXT NOT NULL,
    "barberId" TEXT NOT NULL,
    "weekDay" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "BarberAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BarberAvailability_barberId_weekDay_key" ON "BarberAvailability"("barberId", "weekDay");

ALTER TABLE "BarberAvailability" ADD CONSTRAINT "BarberAvailability_barberId_fkey"
FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
