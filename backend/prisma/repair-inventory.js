const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando reparación de discrepancias de inventario para el CD...');

  // Obtener la sucursal del CD (SUC-001)
  const cd = await prisma.sucursal.findFirst({
    where: { codigo: 'SUC-001' }
  });

  if (!cd) {
    console.error('No se encontró el Centro de Distribución (SUC-001).');
    return;
  }

  // Obtener los registros de inventario para el CD
  const inventariosCD = await prisma.inventario.findMany({
    where: { sucursalId: cd.id },
    include: { producto: true }
  });

  for (const inv of inventariosCD) {
    // Obtener los lotes del producto
    const lotes = await prisma.lote.findMany({
      where: {
        productoId: inv.productoId,
        estado: 'APROBADO',
      },
    });

    const totalLotesQty = lotes.reduce((sum, l) => sum + l.cantidadActual, 0);

    if (lotes.length > 0) {
      if (inv.existencia !== totalLotesQty) {
        console.log(`Corrigiendo ${inv.producto.descripcion} en CD: de ${inv.existencia} a ${totalLotesQty}`);
        await prisma.inventario.update({
          where: { id: inv.id },
          data: { existencia: totalLotesQty },
        });
      }
    }
  }

  console.log('--- Proceso de reparación finalizado ---');
}

main()
  .catch((e) => {
    console.error('Error durante la reparación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
