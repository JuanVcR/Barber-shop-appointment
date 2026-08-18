UPDATE "PlanPrice"
SET "amount" = 29.90,
    "pendingAmount" = NULL,
    "pendingEffectiveAt" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "plan" = 'FREE'
  AND ("amount" IS NULL OR "amount" = 0);
