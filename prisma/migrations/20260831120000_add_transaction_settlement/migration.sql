-- I movimenti esistenti rappresentano operazioni già effettuate e devono
-- continuare a incidere sul saldo reale dopo l'aggiornamento.
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED');

ALTER TABLE "Transaction"
  ADD COLUMN "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'SETTLED',
  ADD COLUMN "dueDate" TIMESTAMP(3);

CREATE INDEX "Transaction_companyId_settlementStatus_dueDate_idx"
  ON "Transaction"("companyId", "settlementStatus", "dueDate");
