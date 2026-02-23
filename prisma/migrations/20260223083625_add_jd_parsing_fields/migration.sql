-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParsedSchema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "roleFamily" TEXT NOT NULL DEFAULT '',
    "seniority" TEXT NOT NULL,
    "competencies" TEXT NOT NULL,
    "tooling" TEXT NOT NULL,
    "decisionContext" TEXT NOT NULL,
    "constraints" TEXT NOT NULL DEFAULT '[]',
    "confidence" REAL NOT NULL,
    "rawResponse" TEXT NOT NULL DEFAULT '',
    "validationErrors" TEXT NOT NULL DEFAULT '[]',
    "validationWarnings" TEXT NOT NULL DEFAULT '[]',
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParsedSchema_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ParsedSchema" ("competencies", "confidence", "decisionContext", "function", "id", "jobId", "seniority", "tooling") SELECT "competencies", "confidence", "decisionContext", "function", "id", "jobId", "seniority", "tooling" FROM "ParsedSchema";
DROP TABLE "ParsedSchema";
ALTER TABLE "new_ParsedSchema" RENAME TO "ParsedSchema";
CREATE UNIQUE INDEX "ParsedSchema_jobId_key" ON "ParsedSchema"("jobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
