"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Iniciando proceso de semilla (seed) para Lácteos MRP...');
    // Limpiar base de datos en orden inverso de dependencias
    await prisma.noConformidad.deleteMany({});
    await prisma.controlCalidad.deleteMany({});
    await prisma.controlLeche.deleteMany({});
    await prisma.merma.deleteMany({});
    await prisma.ordenProduccionDetalle.deleteMany({});
    await prisma.ordenProduccion.deleteMany({});
    await prisma.recetaDetalle.deleteMany({});
    await prisma.receta.deleteMany({});
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
    await prisma.tipoProducto.deleteMany({});
    await prisma.terminoPago.deleteMany({});
    console.log('Base de datos limpia.');
    // 1. Crear Sucursales
    const s1 = await prisma.sucursal.create({
        data: {
            codigo: 'SUC-001',
            nombre: 'Planta de Producción Principal',
            direccion: 'Av. Industrial 1240, Santiago',
            telefono: '+56 2 2345 6789',
            correo: 'planta@lacteosmrp.cl',
            estado: 'ACTIVO',
        },
    });
    const s2 = await prisma.sucursal.create({
        data: {
            codigo: 'SUC-002',
            nombre: 'Distribuidora Express - Providencia',
            direccion: 'Av. Providencia 1920, Santiago',
            telefono: '+56 2 2345 6790',
            correo: 'express@lacteosmrp.cl',
            estado: 'ACTIVO',
        },
    });
    console.log('Sucursales creadas.');
    // Encriptar contraseñas
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('mrp123', salt);
    // 2. Crear Usuarios
    const uAdmin = await prisma.usuario.create({
        data: {
            email: 'admin@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'Carlos Mendoza (Admin)',
            rol: 'ADMINISTRADOR',
            sucursalId: s1.id,
        },
    });
    const uSuper = await prisma.usuario.create({
        data: {
            email: 'supervisor@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'María José Rojas',
            rol: 'SUPERVISOR',
            sucursalId: s1.id,
        },
    });
    const uGerente = await prisma.usuario.create({
        data: {
            email: 'gerente@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'Roberto Gómez',
            rol: 'GERENTE_TIENDA',
            sucursalId: s2.id,
        },
    });
    const uCajero = await prisma.usuario.create({
        data: {
            email: 'cajero@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'Ana Laura Silva',
            rol: 'CAJERO',
            sucursalId: s2.id,
        },
    });
    const uAlmacen = await prisma.usuario.create({
        data: {
            email: 'almacen@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'Juan Perez',
            rol: 'ALMACEN',
            sucursalId: s1.id,
        },
    });
    const uCalidad = await prisma.usuario.create({
        data: {
            email: 'calidad@lacteosmrp.cl',
            password: passwordHash,
            nombre: 'Dra. Elena Vázquez',
            rol: 'CALIDAD',
            sucursalId: s1.id,
        },
    });
    console.log('Usuarios creados (Contraseña por defecto: mrp123).');
    // 3. Crear Términos de Pago y Proveedores
    const tp1 = await prisma.terminoPago.create({
        data: {
            nombre: 'Contado',
            dias: 0,
            estado: 'ACTIVO',
        }
    });
    const provInterno = await prisma.proveedor.create({
        data: {
            codigo: 'INTERNO',
            nombre: 'Producción Interna Lácteos MRP',
            contacto: 'Departamento de Producción',
            telefono: '+56 2 2345 6700',
            correo: 'produccion@lacteosmrp.cl',
            certificaciones: JSON.stringify(['HACCP Planta', 'ISO 22000']),
            estado: 'ACTIVO',
            terminoPagoId: tp1.id,
        }
    });
    const prov1 = await prisma.proveedor.create({
        data: {
            codigo: 'PROV-001',
            nombre: 'Fundo San José (Leche Cruda)',
            contacto: 'Claudio Valdivia',
            telefono: '+56 9 8888 7777',
            correo: 'ventas@fundosanjose.cl',
            certificaciones: JSON.stringify(['ISO 9001', 'HACCP Lácteos', 'Libre de Brucelosis']),
            estado: 'ACTIVO',
            terminoPagoId: tp1.id,
        },
    });
    const prov2 = await prisma.proveedor.create({
        data: {
            codigo: 'PROV-002',
            nombre: 'Insumos y Aditivos del Centro',
            contacto: 'Marta Sanchez',
            telefono: '+56 9 9999 8888',
            correo: 'pedidos@insumoscentro.cl',
            certificaciones: JSON.stringify(['HACCP', 'Certificación Ambiental']),
            estado: 'ACTIVO',
            terminoPagoId: tp1.id,
        },
    });
    console.log('Proveedores creados.');
    // 3.5. Crear Categorías
    await prisma.categoria.createMany({
        data: [
            { nombre: 'LECHE', tipoProducto: 'PRODUCTO_TERMINADO' },
            { nombre: 'YOGURT', tipoProducto: 'PRODUCTO_TERMINADO' },
            { nombre: 'QUESOS', tipoProducto: 'PRODUCTO_TERMINADO' },
            { nombre: 'MANTEQUILLA', tipoProducto: 'PRODUCTO_TERMINADO' },
            { nombre: 'HELADOS', tipoProducto: 'PRODUCTO_TERMINADO' },
            { nombre: 'MATERIA_PRIMA', tipoProducto: 'MATERIA_PRIMA' },
            { nombre: 'INSUMOS', tipoProducto: 'INSUMO' },
            { nombre: 'OTROS', tipoProducto: 'PRODUCTO_TERMINADO' },
        ],
    });
    console.log('Categorías creadas.');
    // 3.6. Crear Tipos de Producto
    await prisma.tipoProducto.createMany({
        data: [
            { nombre: 'PRODUCTO_TERMINADO', descripcion: 'Producto Terminado', metadata: 'Productos listos para la venta en el POS' },
            { nombre: 'INSUMO', descripcion: 'Insumo', metadata: 'Materiales y suministros para empaque, limpieza o aditivos menores' },
            { nombre: 'MATERIA_PRIMA', descripcion: 'Materia Prima', metadata: 'Ingredientes principales (como leche o fruta) para la elaboración' },
        ],
    });
    console.log('Tipos de producto creados.');
    // 4. Crear Productos (Materias primas y Productos Terminados)
    // Materias primas
    const rawLeche = await prisma.producto.create({
        data: {
            sku: 'MP-LECHE-CRUDA',
            codigoBarras: '7801234000104',
            descripcion: 'Leche Cruda Entera (Silo)',
            categoria: 'MATERIA_PRIMA',
            tipoProducto: 'MATERIA_PRIMA',
            marca: 'Fundo San José',
            unidadMedida: 'LITRO',
            costo: 350.0,
            precioVenta: 0.0,
            iva: 0.19,
            temperaturaMin: 2.0,
            temperaturaMax: 4.0,
            vidaUtilDias: 3,
        }
    });
    const insFrutilla = await prisma.producto.create({
        data: {
            sku: 'INS-PREP-FRUTILLA',
            codigoBarras: '7801234000111',
            descripcion: 'Preparado de Frutilla para Yogurt',
            categoria: 'INSUMOS',
            tipoProducto: 'INSUMO',
            marca: 'Aditivos Centro',
            unidadMedida: 'KILO',
            costo: 1200.0,
            precioVenta: 0.0,
            iva: 0.19,
            temperaturaMin: 4.0,
            temperaturaMax: 10.0,
            vidaUtilDias: 90,
        }
    });
    const insAzucar = await prisma.producto.create({
        data: {
            sku: 'INS-AZUCAR',
            codigoBarras: '7801234000128',
            descripcion: 'Azúcar Granulada Saco 25kg',
            categoria: 'INSUMOS',
            tipoProducto: 'INSUMO',
            marca: 'Iansa',
            unidadMedida: 'KILO',
            costo: 900.0,
            precioVenta: 0.0,
            iva: 0.19,
            temperaturaMin: 15.0,
            temperaturaMax: 25.0,
            vidaUtilDias: 365,
        }
    });
    const insCultivos = await prisma.producto.create({
        data: {
            sku: 'INS-CULTIVOS',
            codigoBarras: '7801234000135',
            descripcion: 'Cultivo Láctico Termófilo',
            categoria: 'INSUMOS',
            tipoProducto: 'INSUMO',
            marca: 'Danisco',
            unidadMedida: 'UNIDAD',
            costo: 4500.0,
            precioVenta: 0.0,
            iva: 0.19,
            temperaturaMin: -20.0,
            temperaturaMax: -10.0,
            vidaUtilDias: 180,
        }
    });
    const insCuajo = await prisma.producto.create({
        data: {
            sku: 'INS-CUAJO',
            codigoBarras: '7801234000142',
            descripcion: 'Cuajo Líquido Quimosina',
            categoria: 'INSUMOS',
            tipoProducto: 'INSUMO',
            marca: 'Chr. Hansen',
            unidadMedida: 'LITRO',
            costo: 8500.0,
            precioVenta: 0.0,
            iva: 0.19,
            temperaturaMin: 2.0,
            temperaturaMax: 8.0,
            vidaUtilDias: 180,
        }
    });
    // Productos Terminados
    const p1 = await prisma.producto.create({
        data: {
            sku: 'PROD-LECHE-ENT',
            codigoBarras: '7801234000012',
            descripcion: 'Leche Entera UHT 1L',
            categoria: 'LECHE',
            tipoProducto: 'PRODUCTO_TERMINADO',
            marca: 'Lácteos MRP',
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
            sku: 'PROD-YOG-FRESA-1L',
            codigoBarras: '7801234000029',
            descripcion: 'Yogurt Batido de Fresa 1L',
            categoria: 'YOGURT',
            tipoProducto: 'PRODUCTO_TERMINADO',
            marca: 'Lácteos MRP',
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
            sku: 'PROD-QUE-FRESCO-500G',
            codigoBarras: '7801234000036',
            descripcion: 'Queso Fresco MRP 500g',
            categoria: 'QUESOS',
            tipoProducto: 'PRODUCTO_TERMINADO',
            marca: 'Lácteos MRP',
            unidadMedida: 'UNIDAD',
            costo: 2100.0,
            precioVenta: 3490.0,
            iva: 0.19,
            temperaturaMin: 2.0,
            temperaturaMax: 6.0,
            vidaUtilDias: 15,
        },
    });
    const p4 = await prisma.producto.create({
        data: {
            sku: 'PROD-MAN-SAL',
            codigoBarras: '7801234000043',
            descripcion: 'Mantequilla con Sal Artesanal 250g',
            categoria: 'MANTEQUILLA',
            tipoProducto: 'PRODUCTO_TERMINADO',
            marca: 'Lácteos MRP',
            unidadMedida: 'UNIDAD',
            costo: 1300.0,
            precioVenta: 2190.0,
            iva: 0.19,
            temperaturaMin: 1.0,
            temperaturaMax: 6.0,
            vidaUtilDias: 90,
        },
    });
    console.log('Productos creados (Materias primas e Insumos incluidos).');
    // 5. Crear Lotes (Trazabilidad)
    const hoy = new Date();
    // Lotes de Leche Cruda (para fabricar)
    const loteLeche1 = await prisma.lote.create({
        data: {
            numeroLote: 'L-LECHE-CRUDA-001',
            productoId: rawLeche.id,
            fechaProduccion: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000), // ayer
            fechaVencimiento: new Date(hoy.getTime() + 2 * 24 * 60 * 60 * 1000), // vence en 2 dias
            proveedorId: prov1.id,
            temperaturaRequeridaMin: 2.0,
            temperaturaRequeridaMax: 4.0,
            cantidadInicial: 5000,
            cantidadActual: 4200,
            estado: 'APROBADO',
        }
    });
    // Lotes de Insumos
    const loteFrutilla1 = await prisma.lote.create({
        data: {
            numeroLote: 'L-FRUTILLA-001',
            productoId: insFrutilla.id,
            fechaProduccion: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 80 * 24 * 60 * 60 * 1000),
            proveedorId: prov2.id,
            temperaturaRequeridaMin: 4.0,
            temperaturaRequeridaMax: 10.0,
            cantidadInicial: 200,
            cantidadActual: 185,
            estado: 'APROBADO',
        }
    });
    const loteAzucar1 = await prisma.lote.create({
        data: {
            numeroLote: 'L-AZUCAR-001',
            productoId: insAzucar.id,
            fechaProduccion: new Date(hoy.getTime() - 20 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 340 * 24 * 60 * 60 * 1000),
            proveedorId: prov2.id,
            temperaturaRequeridaMin: 15.0,
            temperaturaRequeridaMax: 25.0,
            cantidadInicial: 1000,
            cantidadActual: 950,
            estado: 'APROBADO',
        }
    });
    const loteCultivos1 = await prisma.lote.create({
        data: {
            numeroLote: 'L-CULTIVOS-001',
            productoId: insCultivos.id,
            fechaProduccion: new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 150 * 24 * 60 * 60 * 1000),
            proveedorId: prov2.id,
            temperaturaRequeridaMin: -20.0,
            temperaturaRequeridaMax: -10.0,
            cantidadInicial: 50,
            cantidadActual: 48,
            estado: 'APROBADO',
        }
    });
    const loteCuajo1 = await prisma.lote.create({
        data: {
            numeroLote: 'L-CUAJO-001',
            productoId: insCuajo.id,
            fechaProduccion: new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 150 * 24 * 60 * 60 * 1000),
            proveedorId: prov2.id,
            temperaturaRequeridaMin: 2.0,
            temperaturaRequeridaMax: 8.0,
            cantidadInicial: 20,
            cantidadActual: 19.5,
            estado: 'APROBADO',
        }
    });
    // Lotes de Productos Terminados
    const loteP1_ok = await prisma.lote.create({
        data: {
            numeroLote: 'L-LECHE-OK',
            productoId: p1.id,
            fechaProduccion: new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 20 * 24 * 60 * 60 * 1000),
            proveedorId: provInterno.id,
            temperaturaRequeridaMin: 2.0,
            temperaturaRequeridaMax: 6.0,
            cantidadInicial: 500,
            cantidadActual: 380,
            estado: 'APROBADO',
        },
    });
    const loteP2_ok = await prisma.lote.create({
        data: {
            numeroLote: 'L-YOG-OK',
            productoId: p2.id,
            fechaProduccion: new Date(hoy.getTime() - 5 * 24 * 60 * 60 * 1000),
            fechaVencimiento: new Date(hoy.getTime() + 16 * 24 * 60 * 60 * 1000),
            proveedorId: provInterno.id,
            temperaturaRequeridaMin: 2.0,
            temperaturaRequeridaMax: 5.0,
            cantidadInicial: 300,
            cantidadActual: 240,
            estado: 'APROBADO',
        },
    });
    console.log('Lotes creados.');
    // 6. Inventario (Existencias en Sucursales/Plantas)
    // Planta de Producción
    await prisma.inventario.create({
        data: { productoId: rawLeche.id, sucursalId: s1.id, existencia: 4200, existMin: 1000, existMax: 10000 },
    });
    await prisma.inventario.create({
        data: { productoId: insFrutilla.id, sucursalId: s1.id, existencia: 185, existMin: 20, existMax: 500 },
    });
    await prisma.inventario.create({
        data: { productoId: insAzucar.id, sucursalId: s1.id, existencia: 950, existMin: 100, existMax: 2000 },
    });
    await prisma.inventario.create({
        data: { productoId: insCultivos.id, sucursalId: s1.id, existencia: 48, existMin: 10, existMax: 100 },
    });
    await prisma.inventario.create({
        data: { productoId: insCuajo.id, sucursalId: s1.id, existencia: 19.5, existMin: 5, existMax: 50 },
    });
    await prisma.inventario.create({
        data: { productoId: p1.id, sucursalId: s1.id, existencia: 380, existMin: 100, existMax: 2000 },
    });
    await prisma.inventario.create({
        data: { productoId: p2.id, sucursalId: s1.id, existencia: 240, existMin: 50, existMax: 1000 },
    });
    await prisma.inventario.create({
        data: { productoId: p3.id, sucursalId: s1.id, existencia: 100, existMin: 20, existMax: 500 },
    });
    await prisma.inventario.create({
        data: { productoId: p4.id, sucursalId: s1.id, existencia: 15, existMin: 20, existMax: 200 }, // Stock Crítico
    });
    // Sucursal Express
    await prisma.inventario.create({
        data: { productoId: p1.id, sucursalId: s2.id, existencia: 50, existMin: 10, existMax: 100 },
    });
    await prisma.inventario.create({
        data: { productoId: p2.id, sucursalId: s2.id, existencia: 45, existMin: 10, existMax: 100 },
    });
    console.log('Inventarios inicializados.');
    // 7. RECETAS
    // Receta 1: Yogurt Batido de Fresa 1L
    const recYogurt = await prisma.receta.create({
        data: {
            nombre: 'Yogurt de Fresa 1L',
            descripcion: 'Receta estándar para elaboración de yogurt de fresa batido en envases de 1L.',
            productoFinalId: p2.id,
            cantidadEsperada: 100, // Lote estándar de 100 unidades
            costoEstimado: 850,
        }
    });
    await prisma.recetaDetalle.createMany({
        data: [
            { recetaId: recYogurt.id, productoId: rawLeche.id, cantidadRequerida: 0.95 }, // 0.95L por unidad
            { recetaId: recYogurt.id, productoId: insFrutilla.id, cantidadRequerida: 0.05 }, // 0.05kg por unidad
            { recetaId: recYogurt.id, productoId: insAzucar.id, cantidadRequerida: 0.03 }, // 0.03kg por unidad
            { recetaId: recYogurt.id, productoId: insCultivos.id, cantidadRequerida: 0.001 }, // 0.001 unidades por unidad
        ]
    });
    // Receta 2: Queso Fresco MRP 500g
    const recQueso = await prisma.receta.create({
        data: {
            nombre: 'Queso Fresco 500g',
            descripcion: 'Receta para elaboración de quesos frescos artesanales de 500 gramos.',
            productoFinalId: p3.id,
            cantidadEsperada: 50, // Lote estándar de 50 quesos
            costoEstimado: 1450,
        }
    });
    await prisma.recetaDetalle.createMany({
        data: [
            { recetaId: recQueso.id, productoId: rawLeche.id, cantidadRequerida: 3.5 }, // 3.5L de leche por queso
            { recetaId: recQueso.id, productoId: insCuajo.id, cantidadRequerida: 0.005 }, // 0.005L por queso
        ]
    });
    console.log('Recetas creadas.');
    // 8. CONTROLES DE CALIDAD DE RECEPCIÓN (LECHE CRUDA)
    const ctrlLeche1 = await prisma.controlLeche.create({
        data: {
            loteId: loteLeche1.id,
            temperatura: 3.5,
            grasa: 3.65,
            proteina: 3.20,
            acidez: 17.5,
            antibioticos: false, // LIBRE
            resultado: 'APROBADO',
            inspectorId: uCalidad.id,
            observaciones: 'Leche de excelente calidad, óptimos parámetros fisicoquímicos.',
            fecha: new Date(hoy.getTime() - 1 * 24 * 60 * 60 * 1000),
        }
    });
    console.log('Controles de leche creados.');
    // 9. ÓRDENES DE PRODUCCIÓN
    // Orden 1: Completada (Yogurt)
    const op1 = await prisma.ordenProduccion.create({
        data: {
            numeroOrden: 'OP-000001',
            recetaId: recYogurt.id,
            sucursalId: s1.id,
            cantidadPlanificada: 100,
            cantidadProducida: 100,
            rendimientoEsperado: 100,
            rendimientoReal: 100,
            variacion: 0,
            estado: 'COMPLETADA',
            fechaInicio: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000),
            fechaFin: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // duracion 4 horas
            creadoPorId: uSuper.id,
            responsableId: uAlmacen.id,
        }
    });
    // Registrar consumos de Orden 1
    await prisma.ordenProduccionDetalle.createMany({
        data: [
            { ordenProduccionId: op1.id, productoId: rawLeche.id, cantidadConsumida: 95 },
            { ordenProduccionId: op1.id, productoId: insFrutilla.id, cantidadConsumida: 5 },
            { ordenProduccionId: op1.id, productoId: insAzucar.id, cantidadConsumida: 3 },
            { ordenProduccionId: op1.id, productoId: insCultivos.id, cantidadConsumida: 0.1 },
        ]
    });
    // Registrar Merma asociada a Orden 1 (Derrame en mezclado)
    await prisma.merma.create({
        data: {
            ordenProduccionId: op1.id,
            productoId: rawLeche.id,
            cantidad: 5.5,
            motivo: 'DERRAME',
            responsableId: uAlmacen.id,
            fecha: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000),
        }
    });
    // Orden 2: En Proceso (Queso)
    const op2 = await prisma.ordenProduccion.create({
        data: {
            numeroOrden: 'OP-000002',
            recetaId: recQueso.id,
            sucursalId: s1.id,
            cantidadPlanificada: 50,
            estado: 'EN_PROCESO',
            fechaInicio: new Date(hoy.getTime() - 2 * 60 * 60 * 1000), // hace 2 horas
            creadoPorId: uSuper.id,
            responsableId: uAlmacen.id,
        }
    });
    // Orden 3: Planificada
    const op3 = await prisma.ordenProduccion.create({
        data: {
            numeroOrden: 'OP-000003',
            recetaId: recYogurt.id,
            sucursalId: s1.id,
            cantidadPlanificada: 150,
            estado: 'PLANIFICADA',
            creadoPorId: uSuper.id,
            responsableId: uAlmacen.id,
        }
    });
    console.log('Órdenes de producción creadas.');
    // 10. INSPECCIONES DE CALIDAD EN PROCESO / PRODUCTO TERMINADO
    await prisma.controlCalidad.create({
        data: {
            tipo: 'PRODUCTO_TERMINADO',
            ordenProduccionId: op1.id,
            loteId: loteP2_ok.id,
            temperatura: 4.2,
            ph: 4.5,
            parametrosCriticos: 'Viscosidad: OK, Sabor: Típico Fresa, Color: Rosado homogéneo',
            resultado: 'APROBADO',
            inspectorId: uCalidad.id,
            observaciones: 'Lote cumple plenamente con los estándares sensoriales y químicos.',
            fecha: new Date(hoy.getTime() - 4 * 24 * 60 * 60 * 1000 + 4.5 * 60 * 60 * 1000),
        }
    });
    console.log('Inspecciones de calidad registradas.');
    // 11. NO CONFORMIDADES
    // Crear una no conformidad activa por cadena de frío
    await prisma.noConformidad.create({
        data: {
            tipo: 'CADENA_FRIO',
            referenciaId: 'FREEZ-002',
            descripcion: 'Desviación de temperatura en Freezer FREEZ-002. Registró -14.2 °C de forma sostenida por 30 minutos.',
            evidenciaUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gYJDx4iK2uT9QAAAAd0SU1FB+YGCQ8eIitbW1IAAAAQSURBVFhXY2BgYGD4DwUMDAwAYQADAPv9fV4AAAAASUVORK5CYII=', // Mock base64 firma o gráfica
            responsableId: uSuper.id,
            estado: 'REGISTRADA',
            accionesCorrectivas: 'Revisión técnica del termostato y reubicación provisoria de helados.',
        }
    });
    console.log('No conformidades creadas.');
    // 12. Freezers y Lecturas (Cadena de Frío)
    const f1 = await prisma.freezer.create({
        data: {
            codigo: 'FREEZ-001',
            nombre: 'Cámara de Almacenamiento Producto Terminado',
            sucursalId: s1.id,
            ubicacion: 'Cámara Frigorífica A',
            temperaturaMin: 2.0,
            temperaturaMax: 6.0,
            estado: 'CONECTADO',
        },
    });
    const f2 = await prisma.freezer.create({
        data: {
            codigo: 'FREEZ-002',
            nombre: 'Isla de Mantenedores Helados',
            sucursalId: s1.id,
            ubicacion: 'Sala Despacho 2',
            temperaturaMin: -24.0,
            temperaturaMax: -18.0,
            estado: 'ALERTA',
        },
    });
    await prisma.freezerLectura.createMany({
        data: [
            { freezerId: f1.id, temperatura: 4.1, humedad: 42, fecha: new Date(hoy.getTime() - 30 * 60 * 1000), estado: 'OK' },
            { freezerId: f1.id, temperatura: 4.2, humedad: 40, fecha: hoy, estado: 'OK' },
            { freezerId: f2.id, temperatura: -16.4, humedad: 65, fecha: new Date(hoy.getTime() - 15 * 60 * 1000), estado: 'ADVERTENCIA' },
            { freezerId: f2.id, temperatura: -14.2, humedad: 70, fecha: hoy, estado: 'CRITICO' },
        ],
    });
    console.log('Equipos de Frío y Lecturas creados.');
    // 13. Alertas
    await prisma.alerta.create({
        data: {
            sucursalId: s1.id,
            tipo: 'TEMPERATURA',
            mensaje: 'Fallo crítico de cadena de frío: Freezer "Isla de Mantenedores Helados" (FREEZ-002) registra -14.2 °C (máximo requerido: -18.0 °C).',
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
    // 14. Auditoría Inicial
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
    console.log('--- PROCESO DE SEMILLA LÁCTEOS MRP FINALIZADO CON ÉXITO ---');
}
main()
    .catch((e) => {
    console.error('Error ejecutando seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
