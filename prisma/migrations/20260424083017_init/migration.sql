-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "heightCm" REAL NOT NULL,
    "dob" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BodyMetric" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "capturedAt" DATETIME NOT NULL,
    "weightKg" REAL,
    "bmi" REAL,
    "bodyFatPct" REAL,
    "bodyFatKg" REAL,
    "skeletalMuscleKg" REAL,
    "skeletalMusclePct" REAL,
    "subcutaneousFatPct" REAL,
    "bmrKcal" INTEGER,
    "metabolicAge" INTEGER,
    "fatFreeMassKg" REAL,
    "visceralFat" REAL,
    "bodyWaterKg" REAL,
    "bodyWaterPct" REAL,
    "muscleMassKg" REAL,
    "muscleMassPct" REAL,
    "boneMassKg" REAL,
    "boneMassPct" REAL,
    "proteinKg" REAL,
    "proteinPct" REAL,
    "source" TEXT NOT NULL,
    "photoPath" TEXT,
    "rawOcrJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbsG" REAL NOT NULL,
    "fatG" REAL NOT NULL,
    "servings" REAL NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MealLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "consumedAt" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" INTEGER,
    "servings" REAL,
    "quickName" TEXT,
    "quickKcal" INTEGER,
    "quickProteinG" REAL,
    "quickCarbsG" REAL,
    "quickFatG" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loggedAt" DATETIME NOT NULL,
    "activeKcal" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "metric" TEXT NOT NULL,
    "targetValue" REAL NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLog_loggedAt_source_key" ON "ActivityLog"("loggedAt", "source");
