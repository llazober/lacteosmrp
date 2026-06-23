import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    // Migración automática de prodId (compatible con SQLite y PostgreSQL)
    try {
      const productosSinId = await this.producto.findMany({
        where: {
          prodId: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (productosSinId.length > 0) {
        console.log(`[MIGRACIÓN AUTOMÁTICA] Encontrados ${productosSinId.length} productos sin prodId. Asignando IDs secuenciales...`);
        
        const maxProd = await this.producto.findFirst({
          where: {
            prodId: { not: null },
          },
          orderBy: {
            prodId: 'desc',
          },
        });
        
        let nextId = (maxProd?.prodId ?? 0) + 1;

        for (const prod of productosSinId) {
          await this.producto.update({
            where: { id: prod.id },
            data: { prodId: nextId },
          });
          console.log(`[MIGRACIÓN AUTOMÁTICA] Asignado prodId ${nextId} a: ${prod.sku}`);
          nextId++;
        }
        console.log('[MIGRACIÓN AUTOMÁTICA] Migración de prodId completada con éxito.');
      }
    } catch (error) {
      console.error('[MIGRACIÓN AUTOMÁTICA] Error al verificar/migrar la base de datos:', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
