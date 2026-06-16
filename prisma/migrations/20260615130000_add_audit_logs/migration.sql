CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_accountId_createdAt_idx"
ON "AuditLog"("accountId", "createdAt");

CREATE INDEX "AuditLog_createdAt_idx"
ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
