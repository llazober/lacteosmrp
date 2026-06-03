const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.producto.findMany({
    select: {
      sku: true,
      descripcion: true,
      categoria: true,
      tipoProducto: true
    }
  });
  console.log("PRODUCTS:");
  console.log(JSON.stringify(products, null, 2));

  const types = await prisma.tipoProducto.findMany();
  console.log("TYPES:");
  console.log(JSON.stringify(types, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
