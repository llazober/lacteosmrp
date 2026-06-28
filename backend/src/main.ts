import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { PrismaService } from './prisma.service';

async function runAutoMigrations(prisma: PrismaService) {
  try {
    // 1. Asegurarse de que cada sucursal tiene al menos una bodega General (para asociarla)
    const sucursales = await prisma.sucursal.findMany();
    for (const suc of sucursales) {
      const defaultBodega = await prisma.bodega.findFirst({
        where: { sucursalId: suc.id, tipoBodega: 'GENERAL' },
      });
      if (!defaultBodega) {
        await prisma.bodega.create({
          data: {
            codigo: `BOD-${suc.codigo}-GEN`,
            nombre: `Bodega General ${suc.nombre}`,
            tipoBodega: 'GENERAL',
            sucursalId: suc.id,
            estado: 'ACTIVO',
          },
        });
        console.log(`Creada bodega general por defecto para sucursal ${suc.nombre}`);
      }
    }

    // 2. Encontrar todos los registros de Inventario donde bodegaId es null
    const inventariosSinBodega = await prisma.inventario.findMany({
      where: {
        OR: [
          { bodegaId: null },
        ]
      },
    });

    if (inventariosSinBodega.length > 0) {
      console.log(`Migrando ${inventariosSinBodega.length} registros de inventario sin bodega...`);
      for (const inv of inventariosSinBodega) {
        const defaultBodega = await prisma.bodega.findFirst({
          where: { sucursalId: inv.sucursalId, tipoBodega: 'GENERAL' },
        });
        if (defaultBodega) {
          const existingInv = await prisma.inventario.findFirst({
            where: { productoId: inv.productoId, bodegaId: defaultBodega.id },
          });
          if (existingInv) {
            await prisma.inventario.update({
              where: { id: existingInv.id },
              data: { existencia: existingInv.existencia + inv.existencia },
            });
            await prisma.inventario.delete({
              where: { id: inv.id },
            });
          } else {
            await prisma.inventario.update({
              where: { id: inv.id },
              data: { bodegaId: defaultBodega.id },
            });
          }
        }
      }
      console.log('Migración de bodegas de inventario completada.');
    }

    // 3. Encontrar todos los registros de MovimientoInventario donde bodegaOrigenId o bodegaDestinoId es null
    const movimientosSinBodega = await prisma.movimientoInventario.findMany({
      where: {
        OR: [
          { bodegaOrigenId: null, sucursalOrigenId: { not: null } },
          { bodegaDestinoId: null, sucursalDestinoId: { not: null } },
        ],
      },
    });

    if (movimientosSinBodega.length > 0) {
      console.log(`Migrando ${movimientosSinBodega.length} movimientos de inventario sin bodega...`);
      for (const mov of movimientosSinBodega) {
        const updateData: any = {};
        if (!mov.bodegaOrigenId && mov.sucursalOrigenId) {
          const defaultBodega = await prisma.bodega.findFirst({
            where: { sucursalId: mov.sucursalOrigenId, tipoBodega: 'GENERAL' },
          });
          if (defaultBodega) {
            updateData.bodegaOrigenId = defaultBodega.id;
          }
        }
        if (!mov.bodegaDestinoId && mov.sucursalDestinoId) {
          const defaultBodega = await prisma.bodega.findFirst({
            where: { sucursalId: mov.sucursalDestinoId, tipoBodega: 'GENERAL' },
          });
          if (defaultBodega) {
            updateData.bodegaDestinoId = defaultBodega.id;
          }
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.movimientoInventario.update({
            where: { id: mov.id },
            data: updateData,
          });
        }
      }
      console.log('Migración de bodegas de movimientos de inventario completada.');
    }
    // 4. Auto-aprobar lotes existentes que no sean de leche cruda y estén en PENDIENTE
    const lotesPendientesNoLeche = await prisma.lote.findMany({
      where: {
        estado: 'PENDIENTE',
        producto: {
          sku: { not: 'MP-LECHE-CRUDA' }
        }
      },
      select: { id: true }
    });
    if (lotesPendientesNoLeche.length > 0) {
      const ids = lotesPendientesNoLeche.map(l => l.id);
      console.log(`Auto-aprobando ${ids.length} lotes pendientes que no son de leche cruda...`);
      await prisma.lote.updateMany({
        where: {
          id: { in: ids }
        },
        data: {
          estado: 'APROBADO'
        }
      });
      console.log('Lotes auto-aprobados con éxito.');
    }
  } catch (error) {
    console.error('Error al ejecutar auto-migraciones de bodegas:', error);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir llamadas desde el frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Aumentar el límite de tamaño de carga para audios
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Prefijo global de API
  app.setGlobalPrefix('api');

  // Ejecutar auto-migración
  const prisma = app.get(PrismaService);
  await runAutoMigrations(prisma);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(
    `Servidor de Lácteos ERP ejecutándose en: http://localhost:${port}/api`,
  );
}
bootstrap();
