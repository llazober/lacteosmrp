-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "bodegaId" TEXT NOT NULL,
    "capacidad" REAL,
    "unidad" TEXT NOT NULL DEFAULT 'Lts',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bin_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Bin" ("bodegaId", "capacidad", "codigo", "createdAt", "estado", "id", "nombre", "updatedAt") SELECT "bodegaId", "capacidad", "codigo", "createdAt", "estado", "id", "nombre", "updatedAt" FROM "Bin";
DROP TABLE "Bin";
ALTER TABLE "new_Bin" RENAME TO "Bin";
CREATE UNIQUE INDEX "Bin_bodegaId_codigo_key" ON "Bin"("bodegaId", "codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
