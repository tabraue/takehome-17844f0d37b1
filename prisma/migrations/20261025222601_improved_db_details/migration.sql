/*
  Warnings:

  - Added the required column `ownerId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - The required column `operationKey` was added to the `Proposal` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hotelId" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Conversation" ("createdAt", "hotelId", "id", "stayId", "updatedAt") SELECT "createdAt", "hotelId", "id", "stayId", "updatedAt" FROM "Conversation";
DROP TABLE "Conversation";
ALTER TABLE "new_Conversation" RENAME TO "Conversation";
CREATE TABLE "new_Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "stayVersion" INTEGER NOT NULL,
    "currentCheckoutAt" TEXT NOT NULL,
    "requestedCheckoutAt" TEXT NOT NULL,
    "feeEur" INTEGER NOT NULL,
    "policyDocumentId" TEXT NOT NULL,
    "policyVersion" INTEGER NOT NULL,
    "policyQuote" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'awaiting_approval',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "receipt" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Proposal" ("approvedAt", "approvedBy", "createdAt", "currentCheckoutAt", "feeEur", "id", "messageId", "policyDocumentId", "policyQuote", "policyVersion", "receipt", "requestedCheckoutAt", "status", "stayVersion", "updatedAt") SELECT "approvedAt", "approvedBy", "createdAt", "currentCheckoutAt", "feeEur", "id", "messageId", "policyDocumentId", "policyQuote", "policyVersion", "receipt", "requestedCheckoutAt", "status", "stayVersion", "updatedAt" FROM "Proposal";
DROP TABLE "Proposal";
ALTER TABLE "new_Proposal" RENAME TO "Proposal";
CREATE UNIQUE INDEX "Proposal_messageId_key" ON "Proposal"("messageId");
CREATE UNIQUE INDEX "Proposal_operationKey_key" ON "Proposal"("operationKey");
CREATE TABLE "new_Trace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT,
    "proposalId" TEXT,
    "step" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "durationMs" INTEGER NOT NULL,
    "remoteRequestId" TEXT,
    "detail" JSONB,
    "simulatedPromptTokens" INTEGER,
    "simulatedCompletionTokens" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trace_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trace_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Trace" ("createdAt", "detail", "durationMs", "id", "messageId", "ok", "remoteRequestId", "step", "updatedAt") SELECT "createdAt", "detail", "durationMs", "id", "messageId", "ok", "remoteRequestId", "step", "updatedAt" FROM "Trace";
DROP TABLE "Trace";
ALTER TABLE "new_Trace" RENAME TO "Trace";
CREATE INDEX "Trace_messageId_idx" ON "Trace"("messageId");
CREATE INDEX "Trace_proposalId_idx" ON "Trace"("proposalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
