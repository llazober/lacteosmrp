const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando asignación de Prod IDs secuenciales...');
  const productos = await prisma.producto.findMany({
    orderBy: { id: 'asc' }
  });
  
  console.log(`Encontrados ${productos.length} productos.`);
  
  for (let i = 0; i < productos.length; i++) {
    const prod = productos[i];
    await prisma.producto.update({
      where: { id: prod.id },
      data: { prodId: i + 1 }
    });
    console.log(`[OK] Asignado prodId ${i + 1} a: ${prod.sku}`);
  }
  
  console.log('--- Proceso de migración finalizado con éxito ---');
}

main()
  .catch((e) => {
    console.error('Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
