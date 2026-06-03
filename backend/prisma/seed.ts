import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando proceso de semilla (seed)...');

  // Limpiar base de datos
  await prisma.auditoria.deleteMany({});
  await prisma.alerta.deleteMany({});
  await prisma.freezerLectura.deleteMany({});
  await prisma.freezer.deleteMany({});
  await prisma.ventaDetalle.deleteMany({});
  await prisma.venta.deleteMany({});
  await prisma.cajaControl.deleteMany({});
  await prisma.ordenCompraDetalle.deleteMany({});
  await prisma.ordenCompra.deleteMany({});
  await prisma.transferenciaDetalle.deleteMany({});
  await prisma.transferencia.deleteMany({});
  await prisma.movimientoInventario.deleteMany({});
  await prisma.inventario.deleteMany({});
  await prisma.lote.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.proveedor.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.sucursal.deleteMany({});
  await prisma.categoria.deleteMany({});

  console.log('Base de datos limpia.');

  // 1. Crear Sucursales
  const s1 = await prisma.sucursal.create({
    data: {
      codigo: 'SUC-001',
      nombre: 'Sucursal Principal - Norte',
      direccion: 'Av. Industrial 1240, Santiago',
      telefono: '+56 2 2345 6789',
      correo: 'sucursal1@lavaquita.cl',
      estado: 'ACTIVO',
    },
  });

  const s2 = await prisma.sucursal.create({
    data: {
      codigo: 'SUC-002',
      nombre: 'Sucursal Express - Providencia',
      direccion: 'Av. Providencia 1920, Santiago',
      telefono: '+56 2 2345 6790',
      correo: 'sucursal2@lavaquita.cl',
      estado: 'ACTIVO',
    },
  });

  console.log('Sucursales creadas.');

  // Encriptar contraseñas
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('lavaquita123', salt);

  // 2. Crear Usuarios
  const uAdmin = await prisma.usuario.create({
    data: {
      email: 'admin@lavaquita.cl',
      password: passwordHash,
      nombre: 'Carlos Mendoza (Admin)',
      rol: 'ADMINISTRADOR',
      sucursalId: s1.id,
    },
  });

  const uSuper = await prisma.usuario.create({
    data: {
      email: 'supervisor@lavaquita.cl',
      password: passwordHash,
      nombre: 'María José Rojas',
      rol: 'SUPERVISOR',
      sucursalId: s1.id,
    },
  });

  const uGerente = await prisma.usuario.create({
    data: {
      email: 'gerente@lavaquita.cl',
      password: passwordHash,
      nombre: 'Roberto Gómez',
      rol: 'GERENTE_TIENDA',
      sucursalId: s2.id,
    },
  });

  const uCajero = await prisma.usuario.create({
    data: {
      email: 'cajero@lavaquita.cl',
      password: passwordHash,
      nombre: 'Ana Laura Silva',
      rol: 'CAJERO',
      sucursalId: s2.id,
    },
  });

  const uAlmacen = await prisma.usuario.create({
    data: {
      email: 'almacen@lavaquita.cl',
      password: passwordHash,
      nombre: 'Juan Perez',
      rol: 'ALMACEN',
      sucursalId: s1.id,
    },
  });

  const uCalidad = await prisma.usuario.create({
    data: {
      email: 'calidad@lavaquita.cl',
      password: passwordHash,
      nombre: 'Dra. Elena Vázquez',
      rol: 'CONTROL_CALIDAD',
      sucursalId: s1.id,
    },
  });

  console.log('Usuarios creados (Contraseña por defecto: lavaquita123).');

  // 3. Crear Proveedores
  const prov1 = await prisma.proveedor.create({
    data: {
      codigo: 'PROV-001',
      nombre: 'Lácteos del Sur S.A.',
      contacto: 'Claudio Valdivia',
      telefono: '+56 9 8888 7777',
      correo: 'ventas@lacteosdelsur.cl',
      certificaciones: JSON.stringify(['ISO 9001', 'HACCP Lácteos', 'Libre de Gluten']),
      estado: 'ACTIVO',
    },
  });

  const prov2 = await prisma.proveedor.create({
    data: {
      codigo: 'PROV-002',
      nombre: 'Distribuidora Colun Express',
      contacto: 'Marta Sanchez',
      telefono: '+56 9 9999 8888',
      correo: 'pedidos@colunexpress.cl',
      certificaciones: JSON.stringify(['HACCP', 'Certificación Ambiental']),
      estado: 'ACTIVO',
    },
  });

  console.log('Proveedores creados.');

  // 3.5. Crear Categorías
  await prisma.categoria.createMany({
    data: [
      { nombre: 'LECHE' },
      { nombre: 'YOGURT' },
      { nombre: 'QUESOS' },
      { nombre: 'MANTEQUILLA' },
      { nombre: 'HELADOS' },
      { nombre: 'POSTRES' },
      { nombre: 'OTROS' },
    ],
  });
  console.log('Categorías creadas.');

  // 4. Crear Productos
  const p1 = await prisma.producto.create({
    data: {
      sku: 'PROD-LECHE-ENT',
      codigoBarras: '7801234000012',
      descripcion: 'Leche Entera Selección 1L',
      categoria: 'LECHE',
      marca: 'La Vaquita Premium',
      unidadMedida: 'LITRO',
      costo: 650.0,
      precioVenta: 990.0,
      iva: 0.19,
      temperaturaMin: 2.0,
      temperaturaMax: 6.0,
      vidaUtilDias: 30,
    },
  });

  const p2 = await prisma.producto.create({
    data: {
      sku: 'PROD-YOG-GRI',
      codigoBarras: '7801234000029',
      descripcion: 'Yogurt Griego Natural Endulzado 500g',
      categoria: 'YOGURT',
      marca: 'La Vaquita Premium',
      unidadMedida: 'UNIDAD',
      costo: 1100.0,
      precioVenta: 1890.0,
      iva: 0.19,
      temperaturaMin: 2.0,
      temperaturaMax: 5.0,
      vidaUtilDias: 21,
    },
  });

  const p3 = await prisma.producto.create({
    data: {
      sku: 'PROD-QUE-MAN',
      codigoBarras: '7801234000036',
      descripcion: 'Queso Mantecoso Laminado Huentelauquén 500g',
      categoria: 'QUESOS',
      marca: 'Huentelauquén',
      unidadMedida: 'UNIDAD',
      costo: 3200.0,
      precioVenta: 4990.0,
      iva: 0.19,
      temperaturaMin: 2.0,
      temperaturaMax: 8.0,
      vidaUtilDias: 60,
    },
  });

  const p4 = await prisma.producto.create({
    data: {
      sku: 'PROD-MAN-SAL',
      codigoBarras: '7801234000043',
      descripcion: 'Mantequilla con Sal Artesanal 250g',
      categoria: 'MANTEQUILLA',
      marca: 'Lácteos Valdivia',
      unidadMedida: 'UNIDAD',
      costo: 1300.0,
      precioVenta: 2190.0,
      iva: 0.19,
      temperaturaMin: 1.0,
      temperaturaMax: 6.0,
      vidaUtilDias: 90,
    },
  });

  const p5 = await prisma.producto.create({
    data: {
      sku: 'PROD-HEL-TRES',
      codigoBarras: '7801234000050',
      descripcion: 'Helado Cremoso Tres Leches 1L',
      categoria: 'HELADOS',
      marca: 'Artesanos del Frío',
      unidadMedida: 'UNIDAD',
      costo: 2400.0,
      precioVenta: 4290.0,
      iva: 0.19,
      temperaturaMin: -22.0,
      temperaturaMax: -18.0,
      vidaUtilDias: 180,
    },
  });

  console.log('Productos creados.');

  // 5. Crear Lotes (Trazabilidad)
  // Fechas relativas
  const hoy = new Date();
  
  const loteP1_ok = await prisma.lote.create({
    data: {
      numeroLote: 'L-LECHE-OK',
      productoId: p1.id,
      fechaProduccion: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000), // hace 10 dias
      fechaVencimiento: new Date(hoy.getTime() + 20 * 24 * 60 * 60 * 1000), // en 20 dias
      proveedorId: prov1.id,
      certificadoUrl: 'https://lavaquita.cl/cert/L-LECHE-OK.pdf',
      temperaturaRequeridaMin: 2.0,
      temperaturaRequeridaMax: 6.0,
      cantidadInicial: 500,
      cantidadActual: 380,
      estado: 'APROBADO',
    },
  });

  const loteP1_vencido = await prisma.lote.create({
    data: {
      numeroLote: 'L-LECHE-VENC',
      productoId: p1.id,
      fechaProduccion: new Date(hoy.getTime() - 35 * 24 * 60 * 60 * 1000), // hace 35 dias
      fechaVencimiento: new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000), // vencido hace 5 dias
      proveedorId: prov1.id,
      certificadoUrl: 'https://lavaquita.cl/cert/L-LECHE-VENC.pdf',
      temperaturaRequeridaMin: 2.0,
      temperaturaRequeridaMax: 6.0,
      cantidadInicial: 200,
      cantidadActual: 15,
      estado: 'VENCIDO',
    },
  });

  const loteP2_ok = await prisma.lote.create({
    data: {
      numeroLote: 'L-YOG-OK',
      productoId: p2.id,
      fechaProduccion: new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000),
      fechaVencimiento: new Date(hoy.getTime() + 16 * 24 * 60 * 60 * 1000),
      proveedorId: prov2.id,
      certificadoUrl: null,
      temperaturaRequeridaMin: 2.0,
      temperaturaRequeridaMax: 5.0,
      cantidadInicial: 300,
      cantidadActual: 240,
      estado: 'APROBADO',
    },
  });

  const loteP2_prox_vencer = await prisma.lote.create({
    data: {
      numeroLote: 'L-YOG-PROX',
      productoId: p2.id,
      fechaProduccion: new Date(hoy.getTime() - 19 * 24 * 60 * 60 * 1000),
      fechaVencimiento: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000), // vence en 2 dias
      proveedorId: prov2.id,
      certificadoUrl: null,
      temperaturaRequeridaMin: 2.0,
      temperaturaRequeridaMax: 5.0,
      cantidadInicial: 100,
      cantidadActual: 42,
      estado: 'APROBADO',
    },
  });

  const loteP3_ok = await prisma.lote.create({
    data: {
      numeroLote: 'L-QUESO-OK',
      productoId: p3.id,
      fechaProduccion: new Date(hoy.getTime() - 15 * 24 * 60 * 60 * 1000),
      fechaVencimiento: new Date(hoy.getTime() + 45 * 24 * 60 * 60 * 1000),
      proveedorId: prov1.id,
      certificadoUrl: 'https://lavaquita.cl/cert/L-QUESO-OK.pdf',
      temperaturaRequeridaMin: 2.0,
      temperaturaRequeridaMax: 8.0,
      cantidadInicial: 150,
      cantidadActual: 110,
      estado: 'APROBADO',
    },
  });

  const loteP5_ok = await prisma.lote.create({
    data: {
      numeroLote: 'L-HELA-OK',
      productoId: p5.id,
      fechaProduccion: new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000),
      fechaVencimiento: new Date(hoy.getTime() + 150 * 24 * 60 * 60 * 1000),
      proveedorId: prov2.id,
      certificadoUrl: null,
      temperaturaRequeridaMin: -22.0,
      temperaturaRequeridaMax: -18.0,
      cantidadInicial: 80,
      cantidadActual: 64,
      estado: 'APROBADO',
    },
  });

  console.log('Lotes creados.');

  // 6. Inventario (Relaciones Sucursal-Producto y Existencias)
  // Sucursal 1 (Principal)
  await prisma.inventario.create({
    data: { productoId: p1.id, sucursalId: s1.id, existencia: 300, existMin: 100, existMax: 1000, comprometido: 0 },
  });
  await prisma.inventario.create({
    data: { productoId: p2.id, sucursalId: s1.id, existencia: 180, existMin: 50, existMax: 500, comprometido: 0 },
  });
  await prisma.inventario.create({
    data: { productoId: p3.id, sucursalId: s1.id, existencia: 80, existMin: 20, existMax: 200, comprometido: 10 },
  });
  await prisma.inventario.create({
    data: { productoId: p4.id, sucursalId: s1.id, existencia: 15, existMin: 20, existMax: 150, comprometido: 0 }, // Stock Crítico (< min)
  });
  await prisma.inventario.create({
    data: { productoId: p5.id, sucursalId: s1.id, existencia: 40, existMin: 15, existMax: 100, comprometido: 0 },
  });

  // Sucursal 2 (Express)
  await prisma.inventario.create({
    data: { productoId: p1.id, sucursalId: s2.id, existencia: 80, existMin: 50, existMax: 300, comprometido: 0 },
  });
  await prisma.inventario.create({
    data: { productoId: p2.id, sucursalId: s2.id, existencia: 102, existMin: 30, existMax: 150, comprometido: 0 },
  });
  await prisma.inventario.create({
    data: { productoId: p3.id, sucursalId: s2.id, existencia: 30, existMin: 10, existMax: 80, comprometido: 0 },
  });
  await prisma.inventario.create({
    data: { productoId: p5.id, sucursalId: s2.id, existencia: 24, existMin: 10, existMax: 50, comprometido: 0 },
  });

  console.log('Inventario asignado a Sucursales.');

  // 7. Movimientos Iniciales de Inventario (Kardex)
  await prisma.movimientoInventario.create({
    data: {
      tipo: 'ENTRADA',
      productoId: p1.id,
      loteId: loteP1_ok.id,
      sucursalDestinoId: s1.id,
      cantidad: 500,
      motivo: 'Recepción orden de compra OC-1029',
      usuarioId: uAlmacen.id,
    },
  });

  await prisma.movimientoInventario.create({
    data: {
      tipo: 'SALIDA',
      productoId: p1.id,
      loteId: loteP1_ok.id,
      sucursalOrigenId: s1.id,
      cantidad: 120,
      motivo: 'Ventas acumuladas POS',
      usuarioId: uCajero.id,
    },
  });

  console.log('Kardex inicial registrado.');

  // 8. Crear Freezers (Cadena de Frío)
  const f1 = await prisma.freezer.create({
    data: {
      codigo: 'FREEZ-001',
      nombre: 'Congelador Exhibidor Láminas',
      sucursalId: s1.id,
      ubicacion: 'Pasillo Lacteos 1',
      temperaturaMin: 2.0,
      temperaturaMax: 6.0,
      estado: 'CONECTADO',
    },
  });

  const f2 = await prisma.freezer.create({
    data: {
      codigo: 'FREEZ-002',
      nombre: 'Isla de Congelados Lácteos',
      sucursalId: s1.id,
      ubicacion: 'Zona Central',
      temperaturaMin: -24.0,
      temperaturaMax: -18.0,
      estado: 'ALERTA', // Alerta simulada
    },
  });

  const f3 = await prisma.freezer.create({
    data: {
      codigo: 'FREEZ-003',
      nombre: 'Vitrina Lácteos Express',
      sucursalId: s2.id,
      ubicacion: 'Cerca de Caja',
      temperaturaMin: 1.0,
      temperaturaMax: 5.0,
      estado: 'CONECTADO',
    },
  });

  console.log('Equipos de Frío creados.');

  // 9. Lecturas históricas de temperatura
  // Freezer 1 (Normal 4.2C)
  await prisma.freezerLectura.createMany({
    data: [
      { freezerId: f1.id, temperatura: 4.1, humedad: 42, fecha: new Date(hoy.getTime() - 30 * 60 * 1000), estado: 'OK' },
      { freezerId: f1.id, temperatura: 4.3, humedad: 41, fecha: new Date(hoy.getTime() - 15 * 60 * 1000), estado: 'OK' },
      { freezerId: f1.id, temperatura: 4.2, humedad: 40, fecha: hoy, estado: 'OK' },
    ],
  });

  // Freezer 2 (Fuera de rango, caliente a -14C, mínimo -18C)
  await prisma.freezerLectura.createMany({
    data: [
      { freezerId: f2.id, temperatura: -19.1, humedad: 62, fecha: new Date(hoy.getTime() - 30 * 60 * 1000), estado: 'OK' },
      { freezerId: f2.id, temperatura: -16.4, humedad: 65, fecha: new Date(hoy.getTime() - 15 * 60 * 1000), estado: 'ADVERTENCIA' },
      { freezerId: f2.id, temperatura: -14.2, humedad: 70, fecha: hoy, estado: 'CRITICO' },
    ],
  });

  console.log('Lecturas de telemetría agregadas.');

  // 10. Alertas del sistema
  await prisma.alerta.create({
    data: {
      sucursalId: s1.id,
      tipo: 'TEMPERATURA',
      mensaje: 'Fallo crítico de cadena de frío: Freezer "Isla de Congelados Lácteos" (FREEZ-002) registra -14.2 °C (máximo requerido: -18.0 °C).',
      estado: 'ACTIVA',
      fecha: hoy,
    },
  });

  await prisma.alerta.create({
    data: {
      sucursalId: s1.id,
      tipo: 'STOCK_BAJO',
      mensaje: 'Stock crítico: El producto "Mantequilla con Sal Artesanal 250g" (PROD-MAN-SAL) se encuentra bajo el stock mínimo (Existencia: 15, Mínimo: 20).',
      estado: 'ACTIVA',
      fecha: new Date(hoy.getTime() - 12 * 60 * 60 * 1000),
    },
  });

  console.log('Alertas activas iniciales creadas.');

  // 11. Auditoría Inicial
  await prisma.auditoria.createMany({
    data: [
      {
        usuarioId: uAdmin.id,
        usuarioNombre: uAdmin.nombre,
        accion: 'LOGIN',
        modulo: 'AUTH',
        detalles: JSON.stringify({ ip: '192.168.1.50', device: 'Windows 11 Chrome' }),
        fecha: new Date(hoy.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        usuarioId: uAlmacen.id,
        usuarioNombre: uAlmacen.nombre,
        accion: 'CREAR_LOTE',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({ lote: loteP1_ok.numeroLote, producto: p1.sku, cantidad: 500 }),
        fecha: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Logs de auditoría iniciales creados.');

  console.log('--- PROCESO DE SEMILLA FINALIZADO CON ÉXITO ---');
}

main()
  .catch((e) => {
    console.error('Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
