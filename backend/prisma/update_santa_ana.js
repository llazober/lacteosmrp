const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando actualización segura de coordenadas a Santa Ana...');

  // Coordenadas de las Sucursales y CD en Santa Ana, El Salvador
  const sucursalesSantaAna = [
    { codigo: 'SUC-001', nombre: 'Centro de Distribución (CD) - Santa Ana', latitud: 13.9785, longitud: -89.5398 },
    { codigo: 'SUC-002', nombre: 'La Vaquita - Providencia', latitud: 13.9861, longitud: -89.5624 },
    { codigo: 'SUC-003', nombre: 'La Vaquita - Metrocentro', latitud: 13.9748, longitud: -89.5512 },
    { codigo: 'SUC-004', nombre: 'La Vaquita - El Palmar', latitud: 14.0012, longitud: -89.5654 },
    { codigo: 'SUC-005', nombre: 'La Vaquita - Col. El Trébol', latitud: 13.9621, longitud: -89.5312 },
    { codigo: 'SUC-006', nombre: 'La Vaquita - Bypass', latitud: 13.9915, longitud: -89.5298 },
  ];

  for (const datos of sucursalesSantaAna) {
    const sucursal = await prisma.sucursal.findFirst({
      where: { codigo: datos.codigo },
    });

    if (sucursal) {
      await prisma.sucursal.update({
        where: { id: sucursal.id },
        data: {
          nombre: datos.nombre,
          latitud: datos.latitud,
          longitud: datos.longitud,
        },
      });
      console.log(`[OK] Sucursal ${datos.codigo} actualizada a Santa Ana.`);
    } else {
      console.log(`[INFO] Sucursal ${datos.codigo} no encontrada en la base de datos.`);
    }
  }

  // Actualizar la flota de camiones para que inicien en la nueva ubicación del CD
  const actualizados = await prisma.camion.updateMany({
    data: {
      gpsLat: 13.9785,
      gpsLng: -89.5398,
    },
  });

  console.log(`[OK] Se actualizaron las coordenadas de ${actualizados.count} camiones.`);
  console.log('--- Proceso de actualización segura finalizado ---');
}

main()
  .catch((e) => {
    console.error('Error durante la actualización:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
