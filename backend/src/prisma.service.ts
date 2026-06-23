import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    // Migración automática de prodId para SQLite en producción
    try {
      // 1. Verificar si la columna prodId existe en la tabla Producto
      const tableInfo: any[] = await this.$queryRawUnsafe(`PRAGMA table_info("Producto")`);
      const hasProdId = tableInfo.some((col: any) => col.name === 'prodId');
      
      if (!hasProdId) {
        console.log('[MIGRACIÓN AUTOMÁTICA] Detectada columna "prodId" faltante en la tabla Producto. Creando columna...');
        
        // 2. Agregar columna nullable
        await this.$executeRawUnsafe(`ALTER TABLE "Producto" ADD COLUMN "prodId" INTEGER`);
        console.log('[MIGRACIÓN AUTOMÁTICA] Columna "prodId" agregada como NULLABLE.');

        // 3. Asignar IDs secuenciales a productos existentes
        const productos: any[] = await this.$queryRawUnsafe(`SELECT id FROM "Producto" ORDER BY "createdAt" ASC`);
        console.log(`[MIGRACIÓN AUTOMÁTICA] Asignando IDs secuenciales a ${productos.length} productos...`);
        for (let i = 0; i < productos.length; i++) {
          await this.$executeRawUnsafe(`UPDATE "Producto" SET "prodId" = ${i + 1} WHERE id = '${productos[i].id}'`);
        }
        
        // 4. Crear índice único
        await this.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Producto_prodId_key" ON "Producto"("prodId")`);
        console.log('[MIGRACIÓN AUTOMÁTICA] Índice único "Producto_prodId_key" creado.');
        console.log('[MIGRACIÓN AUTOMÁTICA] Migración de "prodId" completada con éxito.');
      }
    } catch (error) {
      console.error('[MIGRACIÓN AUTOMÁTICA] Error al verificar/migrar la base de datos:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
