CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

ALTER TABLE "Booking"
ADD COLUMN "status" "BookingStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "BarberBlock" (
  "id" TEXT NOT NULL,
  "barberId" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BarberBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BarberBlock_barberId_day_idx" ON "BarberBlock"("barberId", "day");

ALTER TABLE "BarberBlock"
ADD CONSTRAINT "BarberBlock_barberId_fkey"
FOREIGN KEY ("barberId") REFERENCES "Barber"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
