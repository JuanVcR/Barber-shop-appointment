-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_accountId_fkey";

-- AlterTable
ALTER TABLE "BarberInvite" ALTER COLUMN "serviceIds" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
