const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.producto.findUnique({
    where: { sku: 'INS-AZUCAR' }
  });
  console.log('Product INS-AZUCAR:', p);

  const cats = await prisma.categoria.findMany();
  console.log('All categories:', cats);

  const types = await prisma.tipoProducto.findMany();
  console.log('All types:', types);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
