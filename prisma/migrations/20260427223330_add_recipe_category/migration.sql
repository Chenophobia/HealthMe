-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbsG" REAL NOT NULL,
    "fatG" REAL NOT NULL,
    "servings" REAL NOT NULL DEFAULT 1,
    "notes" TEXT,
    "category" TEXT NOT NULL DEFAULT 'HEAVY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Recipe" ("carbsG", "createdAt", "fatG", "id", "kcal", "name", "notes", "proteinG", "servings") SELECT "carbsG", "createdAt", "fatG", "id", "kcal", "name", "notes", "proteinG", "servings" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
