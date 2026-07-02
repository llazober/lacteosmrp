-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "latitud" REAL,
    "longitud" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "pin" TEXT,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "sucursalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Usuario_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "permisos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "tipoProducto" TEXT NOT NULL DEFAULT 'PRODUCTO_TERMINADO',
    "marca" TEXT NOT NULL,
    "unidadMedida" TEXT NOT NULL,
    "costo" REAL NOT NULL,
    "precioVenta" REAL NOT NULL,
    "iva" REAL NOT NULL DEFAULT 0.0,
    "temperaturaMin" REAL NOT NULL,
    "temperaturaMax" REAL NOT NULL,
    "vidaUtilDias" INTEGER NOT NULL,
    "leadTime" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "esManufacturado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "prodId" INTEGER
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "certificaciones" TEXT NOT NULL DEFAULT '[]',
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "terminoPagoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "bancoNombre" TEXT,
    "bancoTipoCuenta" TEXT,
    "bancoNroCuenta" TEXT,
    "bancoRutTitular" TEXT,
    "bancoNomTitular" TEXT,
    CONSTRAINT "Proveedor_terminoPagoId_fkey" FOREIGN KEY ("terminoPagoId") REFERENCES "TerminoPago" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroLote" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "fechaProduccion" DATETIME NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "certificadoUrl" TEXT,
    "temperaturaRequeridaMin" REAL NOT NULL,
    "temperaturaRequeridaMax" REAL NOT NULL,
    "cantidadInicial" REAL NOT NULL,
    "cantidadActual" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'APROBADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ordenProduccionId" TEXT,
    CONSTRAINT "Lote_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Lote_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Lote_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bodega" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoBodega" TEXT NOT NULL DEFAULT 'GENERAL',
    "sucursalId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bodega_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "bodegaId" TEXT NOT NULL,
    "capacidad" REAL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bin_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "bodegaId" TEXT,
    "binId" TEXT,
    "existencia" REAL NOT NULL DEFAULT 0,
    "existMin" REAL NOT NULL DEFAULT 0,
    "existMax" REAL NOT NULL DEFAULT 0,
    "comprometido" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventario_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventario_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inventario_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT,
    "sucursalOrigenId" TEXT,
    "sucursalDestinoId" TEXT,
    "bodegaOrigenId" TEXT,
    "bodegaDestinoId" TEXT,
    "cantidad" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_sucursalOrigenId_fkey" FOREIGN KEY ("sucursalOrigenId") REFERENCES "Sucursal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_sucursalDestinoId_fkey" FOREIGN KEY ("sucursalDestinoId") REFERENCES "Sucursal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_bodegaOrigenId_fkey" FOREIGN KEY ("bodegaOrigenId") REFERENCES "Bodega" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_bodegaDestinoId_fkey" FOREIGN KEY ("bodegaDestinoId") REFERENCES "Bodega" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "origenId" TEXT NOT NULL,
    "destinoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaEnvio" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRecepcion" DATETIME,
    "creadoPorId" TEXT NOT NULL,
    "recibidoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transferencia_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transferencia_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferenciaDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferenciaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "TransferenciaDetalle_transferenciaId_fkey" FOREIGN KEY ("transferenciaId") REFERENCES "Transferencia" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferenciaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransferenciaDetalle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroOrden" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEntrega" DATETIME,
    "total" REAL NOT NULL DEFAULT 0,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenCompra_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenCompra_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenCompraDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "cantidadRecibida" REAL NOT NULL DEFAULT 0,
    "costoUnitario" REAL NOT NULL,
    "fechaEntrega" DATETIME,
    "lineaNum" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,
    CONSTRAINT "OrdenCompraDetalle_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenCompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CajaControl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sucursalId" TEXT NOT NULL,
    "cajeroId" TEXT NOT NULL,
    "fechaApertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" DATETIME,
    "montoApertura" REAL NOT NULL,
    "montoCierre" REAL,
    "montoArqueo" REAL,
    "diferencia" REAL,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CajaControl_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CajaControl_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketNumero" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "clienteDocumento" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "iva" REAL NOT NULL,
    "total" REAL NOT NULL,
    "cajeroId" TEXT NOT NULL,
    "cajaAperturaId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADA',
    CONSTRAINT "Venta_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_cajeroId_fkey" FOREIGN KEY ("cajeroId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_cajaAperturaId_fkey" FOREIGN KEY ("cajaAperturaId") REFERENCES "CajaControl" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VentaDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "iva" REAL NOT NULL,
    "total" REAL NOT NULL,
    CONSTRAINT "VentaDetalle_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VentaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VentaDetalle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Freezer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "ubicacion" TEXT NOT NULL,
    "temperaturaMin" REAL NOT NULL,
    "temperaturaMax" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'CONECTADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Freezer_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FreezerLectura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "freezerId" TEXT NOT NULL,
    "temperatura" REAL NOT NULL,
    "humedad" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'OK',
    CONSTRAINT "FreezerLectura_freezerId_fkey" FOREIGN KEY ("freezerId") REFERENCES "Freezer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sucursalId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVA',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atendidaPorId" TEXT,
    "notasAtencion" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Alerta_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alerta_atendidaPorId_fkey" FOREIGN KEY ("atendidaPorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL DEFAULT 'Sistema',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "detalles" TEXT NOT NULL,
    CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipoProducto" TEXT NOT NULL DEFAULT 'PRODUCTO_TERMINADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TipoProducto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnidadMedida" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "abreviacion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMensaje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contenido" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "sucursalId" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMensaje_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatMensaje_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "clave" TEXT NOT NULL PRIMARY KEY,
    "valor" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nit" TEXT,
    "web" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TerminoPago" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "dias" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RecepcionCompra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroRecepcion" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidoPorId" TEXT NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecepcionCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecepcionCompra_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecepcionCompraDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recepcionCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT,
    "cantidad" REAL NOT NULL,
    CONSTRAINT "RecepcionCompraDetalle_recepcionCompraId_fkey" FOREIGN KEY ("recepcionCompraId") REFERENCES "RecepcionCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecepcionCompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacturaCompra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroFactura" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "recepcionMaterialId" TEXT,
    "fechaEmision" DATETIME NOT NULL,
    "fechaVencimiento" DATETIME NOT NULL,
    "subtotal" REAL NOT NULL,
    "iva" REAL NOT NULL,
    "total" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FacturaCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FacturaCompra_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FacturaCompra_recepcionMaterialId_fkey" FOREIGN KEY ("recepcionMaterialId") REFERENCES "RecepcionMaterial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FacturaCompraDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "costoUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "FacturaCompraDetalle_facturaCompraId_fkey" FOREIGN KEY ("facturaCompraId") REFERENCES "FacturaCompra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FacturaCompraDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PagoCompra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "facturaCompraId" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "fechaPago" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodoPago" TEXT NOT NULL,
    "referencia" TEXT,
    "cajaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chequeNumero" TEXT,
    "chequeBanco" TEXT,
    "chequeVence" DATETIME,
    "transfeCuenta" TEXT,
    CONSTRAINT "PagoCompra_facturaCompraId_fkey" FOREIGN KEY ("facturaCompraId") REFERENCES "FacturaCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PagoCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "productoFinalId" TEXT NOT NULL,
    "cantidadEsperada" REAL NOT NULL DEFAULT 1.0,
    "costoEstimado" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receta_productoFinalId_fkey" FOREIGN KEY ("productoFinalId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecetaDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadRequerida" REAL NOT NULL,
    CONSTRAINT "RecetaDetalle_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecetaDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecetaDetalleSustituto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaDetalleId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    CONSTRAINT "RecetaDetalleSustituto_recetaDetalleId_fkey" FOREIGN KEY ("recetaDetalleId") REFERENCES "RecetaDetalle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecetaDetalleSustituto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenProduccion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroOrden" TEXT NOT NULL,
    "recetaId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "cantidadPlanificada" REAL NOT NULL,
    "cantidadProducida" REAL NOT NULL DEFAULT 0.0,
    "rendimientoEsperado" REAL NOT NULL DEFAULT 100.0,
    "rendimientoReal" REAL NOT NULL DEFAULT 0.0,
    "variacion" REAL NOT NULL DEFAULT 0.0,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "pickingCompletado" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" DATETIME,
    "fechaFin" DATETIME,
    "fechaEntrega" DATETIME,
    "creadoPorId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdenProduccion_recetaId_fkey" FOREIGN KEY ("recetaId") REFERENCES "Receta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenProduccion_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenProduccion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenProduccion_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenProduccionDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordenProduccionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT,
    "cantidadConsumida" REAL NOT NULL,
    CONSTRAINT "OrdenProduccionDetalle_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrdenProduccionDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdenProduccionDetalle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Merma" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordenProduccionId" TEXT,
    "productoId" TEXT NOT NULL,
    "loteId" TEXT,
    "cantidad" REAL NOT NULL,
    "motivo" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Merma_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Merma_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Merma_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ControlLeche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recepcionId" TEXT,
    "loteId" TEXT,
    "temperatura" REAL NOT NULL,
    "grasa" REAL NOT NULL,
    "proteina" REAL NOT NULL,
    "acidez" REAL NOT NULL,
    "antibioticos" BOOLEAN NOT NULL,
    "resultado" TEXT NOT NULL DEFAULT 'APROBADO',
    "inspectorId" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ControlLeche_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ControlCalidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "ordenProduccionId" TEXT,
    "loteId" TEXT,
    "temperatura" REAL,
    "ph" REAL,
    "parametrosCriticos" TEXT NOT NULL,
    "resultado" TEXT NOT NULL DEFAULT 'APROBADO',
    "inspectorId" TEXT NOT NULL,
    "observaciones" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ControlCalidad_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ControlCalidad_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoConformidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "referenciaId" TEXT,
    "descripcion" TEXT NOT NULL,
    "evidenciaUrl" TEXT,
    "responsableId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'REGISTRADA',
    "accionesCorrectivas" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoConformidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Camion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placa" TEXT NOT NULL,
    "capacidadPeso" REAL NOT NULL,
    "capacidadVolumen" REAL NOT NULL,
    "temperaturaMin" REAL NOT NULL,
    "temperaturaMax" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "gpsLat" REAL,
    "gpsLng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conductor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "licencia" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PLANIFICADA',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origenId" TEXT NOT NULL,
    "kilometros" REAL NOT NULL DEFAULT 0,
    "tiempoEstimado" REAL NOT NULL DEFAULT 0,
    "consumoEstimado" REAL NOT NULL DEFAULT 0,
    "costoEntrega" REAL NOT NULL DEFAULT 0,
    "temperaturaSalida" REAL,
    "temperaturaRecepcion" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ruta_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "Camion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ruta_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Conductor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ruta_origenId_fkey" FOREIGN KEY ("origenId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RutaPunto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rutaId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "ordenVisita" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "tipo" TEXT NOT NULL DEFAULT 'ENTREGA',
    CONSTRAINT "RutaPunto_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RutaPunto_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RutaTemperatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rutaId" TEXT NOT NULL,
    "temperatura" REAL NOT NULL,
    "humedad" REAL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'OK',
    "ubicacion" TEXT,
    CONSTRAINT "RutaTemperatura_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SolicitudReabastecimiento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codigo" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidadSugerida" REAL NOT NULL,
    "cantidadAprobada" REAL,
    "diasInventario" REAL NOT NULL,
    "stockObjetivo" REAL NOT NULL,
    "stockActual" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "tipoOrigen" TEXT,
    "origenSugeridoId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SolicitudReabastecimiento_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SolicitudReabastecimiento_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdenProduccionOperacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ordenProduccionId" TEXT NOT NULL,
    "workCenter" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "fechaInicio" DATETIME,
    "fechaFin" DATETIME,
    "duracionSegundos" INTEGER,
    "duracionEstimada" INTEGER NOT NULL DEFAULT 30,
    "datosJson" TEXT,
    "datosRequeridos" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdenProduccionOperacion_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CentroTrabajo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "duracionEstimada" INTEGER NOT NULL DEFAULT 30,
    "datosRequeridos" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BillOfOperations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "workCenter" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "duracionEstimada" INTEGER NOT NULL DEFAULT 30,
    "datosRequeridos" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillOfOperations_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductoProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "esPredeterminado" BOOLEAN NOT NULL DEFAULT false,
    "costoProveedor" REAL,
    "codigoProveedor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecepcionMaterial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroRecibo" TEXT NOT NULL,
    "ordenCompraId" TEXT,
    "proveedorId" TEXT,
    "sucursalId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibidoPorId" TEXT NOT NULL,
    "facturaNumero" TEXT,
    "packingSlip" TEXT,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecepcionMaterial_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecepcionMaterial_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecepcionMaterial_recibidoPorId_fkey" FOREIGN KEY ("recibidoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecepcionMaterial_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecepcionMaterialDetalle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recepcionMaterialId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" REAL NOT NULL,
    "costoUnitario" REAL,
    "loteId" TEXT,
    CONSTRAINT "RecepcionMaterialDetalle_recepcionMaterialId_fkey" FOREIGN KEY ("recepcionMaterialId") REFERENCES "RecepcionMaterial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecepcionMaterialDetalle_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecepcionMaterialDetalle_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MezclaLeche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loteMixtoId" TEXT NOT NULL,
    "ordenProduccionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MezclaLeche_loteMixtoId_fkey" FOREIGN KEY ("loteMixtoId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MezclaLeche_ordenProduccionId_fkey" FOREIGN KEY ("ordenProduccionId") REFERENCES "OrdenProduccion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MezclaLecheComponente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mezclaLecheId" TEXT NOT NULL,
    "loteOrigenId" TEXT NOT NULL,
    "cantidadUsada" REAL NOT NULL,
    "proporcion" REAL NOT NULL,
    CONSTRAINT "MezclaLecheComponente_mezclaLecheId_fkey" FOREIGN KEY ("mezclaLecheId") REFERENCES "MezclaLeche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MezclaLecheComponente_loteOrigenId_fkey" FOREIGN KEY ("loteOrigenId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Sucursal_codigo_key" ON "Sucursal"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_sku_key" ON "Producto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_prodId_key" ON "Producto"("prodId");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_codigo_key" ON "Proveedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_numeroLote_key" ON "Lote"("numeroLote");

-- CreateIndex
CREATE UNIQUE INDEX "Bodega_codigo_key" ON "Bodega"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Bin_bodegaId_codigo_key" ON "Bin"("bodegaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_productoId_bodegaId_key" ON "Inventario"("productoId", "bodegaId");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_codigo_key" ON "Transferencia"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_numeroOrden_key" ON "OrdenCompra"("numeroOrden");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_ticketNumero_key" ON "Venta"("ticketNumero");

-- CreateIndex
CREATE UNIQUE INDEX "Freezer_codigo_key" ON "Freezer"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoProducto_nombre_key" ON "TipoProducto"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadMedida_nombre_key" ON "UnidadMedida"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TerminoPago_nombre_key" ON "TerminoPago"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "RecepcionCompra_numeroRecepcion_key" ON "RecepcionCompra"("numeroRecepcion");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaCompra_recepcionMaterialId_key" ON "FacturaCompra"("recepcionMaterialId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaCompra_proveedorId_numeroFactura_key" ON "FacturaCompra"("proveedorId", "numeroFactura");

-- CreateIndex
CREATE UNIQUE INDEX "Receta_nombre_key" ON "Receta"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "RecetaDetalleSustituto_recetaDetalleId_productoId_key" ON "RecetaDetalleSustituto"("recetaDetalleId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenProduccion_numeroOrden_key" ON "OrdenProduccion"("numeroOrden");

-- CreateIndex
CREATE UNIQUE INDEX "Camion_placa_key" ON "Camion"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_codigo_key" ON "Ruta"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudReabastecimiento_codigo_key" ON "SolicitudReabastecimiento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenProduccionOperacion_ordenProduccionId_workCenter_key" ON "OrdenProduccionOperacion"("ordenProduccionId", "workCenter");

-- CreateIndex
CREATE UNIQUE INDEX "BillOfOperations_productoId_workCenter_key" ON "BillOfOperations"("productoId", "workCenter");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoProveedor_productoId_proveedorId_key" ON "ProductoProveedor"("productoId", "proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "RecepcionMaterial_numeroRecibo_key" ON "RecepcionMaterial"("numeroRecibo");
