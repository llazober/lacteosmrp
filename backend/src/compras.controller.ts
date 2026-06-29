import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('compras')
export class ComprasController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async obtenerOrdenesCompra(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }

    return this.prisma.ordenCompra.findMany({
      where: filter,
      include: {
        proveedor: true,
        sucursal: true,
        creadoPor: { select: { nombre: true } },
        detalles: {
          include: {
            producto: true,
          },
          orderBy: { lineaNum: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post()
  async crearOrdenCompra(@Request() req: any, @Body() body: any) {
    const { proveedorId, sucursalId, productos, fechaEntrega } = body; // productos: [{ productoId, cantidad, costoUnitario }]

    if (!proveedorId || !sucursalId || !productos || productos.length === 0) {
      throw new BadRequestException(
        'El proveedor, la sucursal y la lista de productos son obligatorios.',
      );
    }

    // Generar número de orden único
    const count = await this.prisma.ordenCompra.count();
    const numeroOrden = `OC-${String(count + 1).padStart(5, '0')}`;

    // Calcular total and validate quantities
    let total = 0;
    for (const p of productos) {
      const prodDb = await this.prisma.producto.findUnique({
        where: { id: p.productoId },
      });
      const qtyNum = parseFloat(p.cantidad);
      if (prodDb && prodDb.unidadMedida.toUpperCase() === 'UNIDAD' && qtyNum % 1 !== 0) {
        throw new BadRequestException(
          `Para el producto "${prodDb.descripcion}" (Unidades), la cantidad debe ser un número entero.`,
        );
      }
      total += qtyNum * parseFloat(p.costoUnitario);
    }

    let maxFechaEntrega: Date | null = null;
    for (const p of productos) {
      if (p.fechaEntrega) {
        const d = new Date(p.fechaEntrega);
        if (!maxFechaEntrega || d > maxFechaEntrega) {
          maxFechaEntrega = d;
        }
      }
    }

    const oc = await this.prisma.$transaction(async (tx) => {
      const cabecera = await tx.ordenCompra.create({
        data: {
          numeroOrden,
          proveedorId,
          sucursalId,
          estado: 'PENDIENTE',
          total,
          creadoPorId: req.user.id,
          fechaEntrega: maxFechaEntrega || (fechaEntrega ? new Date(fechaEntrega) : null),
        },
      });

      let idx = 1;
      for (const p of productos) {
        await tx.ordenCompraDetalle.create({
          data: {
            ordenCompraId: cabecera.id,
            productoId: p.productoId,
            cantidad: parseFloat(p.cantidad),
            costoUnitario: parseFloat(p.costoUnitario),
            fechaEntrega: p.fechaEntrega ? new Date(p.fechaEntrega) : null,
            lineaNum: idx++,
          },
        });
      }

      return cabecera;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ id: oc.id, numeroOrden: oc.numeroOrden }),
      },
    });

    return oc;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put(':id/aprobar')
  async aprobarOrdenCompra(@Param('id') id: string, @Request() req: any) {
    const oc = await this.prisma.ordenCompra.findUnique({ where: { id } });
    if (!oc || oc.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        'La orden de compra no existe o no se encuentra pendiente de aprobación.',
      );
    }

    const updated = await this.prisma.ordenCompra.update({
      where: { id },
      data: { estado: 'APROBADA' },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'APROBAR_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ id, numeroOrden: oc.numeroOrden }),
      },
    });

    return updated;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put(':id/recepcion')
  async registrarRecepcion(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    // body: { lotes: [{ productoId, numeroLote, fechaProduccion, fechaVencimiento, tempMin, tempMax, cantidadRecibida }] }
    const { lotes } = body;

    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        detalles: {
          orderBy: { lineaNum: 'asc' },
        },
      },
    });

    if (!oc || (oc.estado !== 'APROBADA' && oc.estado !== 'PARCIAL')) {
      throw new BadRequestException(
        'La orden de compra no existe o no se encuentra en un estado válido para recibir mercadería (APROBADA o PARCIAL).',
      );
    }

    if (!lotes || lotes.length === 0) {
      throw new BadRequestException(
        'Debe registrar la información de lotes y cantidades recibidas.',
      );
    }

    // Registrar ingreso e inventario
    await this.prisma.$transaction(async (tx) => {
      // 1. Registrar cada lote e incrementar inventario
      for (const loteInfo of lotes) {
        const cantidadRecibidaAhora = parseFloat(loteInfo.cantidadRecibida);
        if (cantidadRecibidaAhora <= 0) continue; // Si se recibe 0 de este item, saltar

        const prodDb = await tx.producto.findUnique({
          where: { id: loteInfo.productoId },
        });
        if (prodDb && prodDb.unidadMedida.toUpperCase() === 'UNIDAD' && cantidadRecibidaAhora % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto "${prodDb.descripcion}" (Unidades), la cantidad recibida debe ser un número entero.`,
          );
        }

        // Validar número lote único
        const existLote = await tx.lote.findUnique({
          where: { numeroLote: loteInfo.numeroLote },
        });

        if (existLote) {
          throw new BadRequestException(
            `El número de lote "${loteInfo.numeroLote}" ya existe en el sistema.`,
          );
        }

        // Buscar el detalle correspondiente de la Orden de Compra para actualizar la cantidad recibida
        const detalle = oc.detalles.find(
          (d) => d.productoId === loteInfo.productoId,
        );
        if (!detalle) {
          throw new BadRequestException(
            `El producto con ID ${loteInfo.productoId} no pertenece a esta orden de compra.`,
          );
        }

        // Actualizar la cantidad recibida en el detalle
        await tx.ordenCompraDetalle.update({
          where: { id: detalle.id },
          data: {
            cantidadRecibida: { increment: cantidadRecibidaAhora },
          },
        });

        // Crear lote
        const nuevoLote = await tx.lote.create({
          data: {
            numeroLote: loteInfo.numeroLote,
            productoId: loteInfo.productoId,
            fechaProduccion: new Date(loteInfo.fechaProduccion),
            fechaVencimiento: new Date(loteInfo.fechaVencimiento),
            proveedorId: oc.proveedorId,
            temperaturaRequeridaMin: parseFloat(loteInfo.tempMin || 2.0),
            temperaturaRequeridaMax: parseFloat(loteInfo.tempMax || 6.0),
            cantidadInicial: cantidadRecibidaAhora,
            cantidadActual: cantidadRecibidaAhora,
            estado: 'PENDIENTE',
          },
        });

        const targetBodega = await this.obtenerBodegaParaProducto(oc.sucursalId, loteInfo.productoId, tx);
        if (!targetBodega) {
          throw new BadRequestException('No se encontró bodega para recibir el producto.');
        }

        // Upsert en inventario
        await tx.inventario.upsert({
          where: {
            productoId_bodegaId: {
              productoId: loteInfo.productoId,
              bodegaId: targetBodega.id,
            },
          },
          update: { existencia: { increment: cantidadRecibidaAhora } },
          create: {
            productoId: loteInfo.productoId,
            sucursalId: oc.sucursalId,
            bodegaId: targetBodega.id,
            existencia: cantidadRecibidaAhora,
            existMin: 10,
            existMax: 500,
          },
        });

        // Registrar movimiento
        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: loteInfo.productoId,
            loteId: nuevoLote.id,
            sucursalDestinoId: oc.sucursalId,
            bodegaDestinoId: targetBodega.id,
            cantidad: cantidadRecibidaAhora,
            motivo: `Recepción de mercadería por OC ${oc.numeroOrden}`,
            usuarioId: req.user.id,
          },
        });
      }

      // 2. Verificar si toda la orden fue recibida
      const detallesActualizados = await tx.ordenCompraDetalle.findMany({
        where: { ordenCompraId: id },
      });

      let totalCompletado = true;
      for (const det of detallesActualizados) {
        if (det.cantidadRecibida < det.cantidad) {
          totalCompletado = false;
          break;
        }
      }

      const nuevoEstado = totalCompletado ? 'RECIBIDA' : 'PARCIAL';
      await tx.ordenCompra.update({
        where: { id },
        data: { estado: nuevoEstado },
      });
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'RECIBIR_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ id, numeroOrden: oc.numeroOrden }),
      },
    });

    return {
      message: 'Mercadería recibida y lotes registrados en stock exitosamente.',
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Put(':id')
  async editarOrdenCompra(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { proveedorId, sucursalId, productos, fechaEntrega, estado } = body;

    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        detalles: {
          orderBy: { lineaNum: 'asc' },
        },
      },
    });

    if (!oc) {
      throw new BadRequestException('La orden de compra no existe.');
    }

    if ((oc.estado === 'RECIBIDA' || oc.estado === 'PARCIAL') && !estado) {
      throw new BadRequestException(
        'No se puede editar una orden de compra que ya ha sido recibida o se encuentra parcialmente recibida.',
      );
    }

    let total = oc.total;
    if (productos && productos.length > 0) {
      total = 0;
      for (const p of productos) {
        const prodDb = await this.prisma.producto.findUnique({
          where: { id: p.productoId },
        });
        const qtyNum = parseFloat(p.cantidad);
        if (prodDb && prodDb.unidadMedida.toUpperCase() === 'UNIDAD' && qtyNum % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto "${prodDb.descripcion}" (Unidades), la cantidad debe ser un número entero.`,
          );
        }
        total += qtyNum * parseFloat(p.costoUnitario);
      }
    }

    let maxFechaEntrega: Date | null = null;
    if (productos && productos.length > 0) {
      for (const p of productos) {
        if (p.fechaEntrega) {
          const d = new Date(p.fechaEntrega);
          if (!maxFechaEntrega || d > maxFechaEntrega) {
            maxFechaEntrega = d;
          }
        }
      }
    }

    const updatedOc = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ordenCompra.update({
        where: { id },
        data: {
          proveedorId: proveedorId !== undefined ? proveedorId : oc.proveedorId,
          sucursalId: sucursalId !== undefined ? sucursalId : oc.sucursalId,
          estado: estado !== undefined ? estado : oc.estado,
          fechaEntrega:
            productos && productos.length > 0
              ? maxFechaEntrega
              : fechaEntrega !== undefined
              ? fechaEntrega
                ? new Date(fechaEntrega)
                : null
              : oc.fechaEntrega,
          total,
        },
      });

      if (productos && productos.length > 0) {
        await tx.ordenCompraDetalle.deleteMany({
          where: { ordenCompraId: id },
        });

        let idx = 1;
        for (const p of productos) {
          await tx.ordenCompraDetalle.create({
            data: {
              ordenCompraId: id,
              productoId: p.productoId,
              cantidad: parseFloat(p.cantidad),
              costoUnitario: parseFloat(p.costoUnitario),
              fechaEntrega: p.fechaEntrega ? new Date(p.fechaEntrega) : null,
              lineaNum: idx++,
            },
          });
        }
      }

      return updated;
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'EDITAR_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ antes: oc, despues: updatedOc }),
      },
    });

    return updatedOc;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete(':id')
  async eliminarOrdenCompra(@Param('id') id: string, @Request() req: any) {
    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
    });

    if (!oc) {
      throw new BadRequestException('La orden de compra no existe.');
    }

    if (oc.estado === 'RECIBIDA' || oc.estado === 'PARCIAL') {
      throw new BadRequestException(
        'No se puede eliminar una orden de compra que ya ha sido recibida o se encuentra parcialmente recibida.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ordenCompraDetalle.deleteMany({
        where: { ordenCompraId: id },
      });

      await tx.ordenCompra.delete({
        where: { id },
      });
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify(oc),
      },
    });

    return {
      success: true,
      message: 'Orden de compra eliminada exitosamente.',
    };
  }

  @Get('requerimientos-debug')
  async debugRequerimientosMateriaPrima() {
    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    
    const sucursalId = cd?.id;
    if (!sucursalId) {
      return { error: 'El Centro de Distribución principal (SUC-001) no está registrado.' };
    }

    const categoriasMP = await this.prisma.categoria.findMany({
      where: {
        tipoProducto: {
          in: ['MATERIA_PRIMA', 'INSUMO', 'MP'],
        },
      },
    });
    const nombresCategoriasMP = categoriasMP.map((c) => c.nombre);
    const nombresCategoriasMPUpper = new Set(nombresCategoriasMP.map(n => n.toUpperCase()));
    
    const nombresCategoriasFijasUpper = new Set([
      'MATERIA_PRIMA',
      'INSUMOS',
      'INSUMO',
      'LECHE Y DERIVADOS',
      'LECHES Y DERIVADOS',
      'CULTIVOS Y FERMENTOS',
      'ADITIVOS',
      'INSUMOS'
    ]);

    const ordenesAbiertas = await this.prisma.ordenCompra.findMany({
      where: {
        estado: {
          notIn: ['RECIBIDA', 'CANCELADA'],
        },
      },
      include: {
        detalles: true,
      },
    });

    const ocsAbiertasInfo = ordenesAbiertas.map(oc => ({
      id: oc.id,
      numeroOrden: oc.numeroOrden,
      estado: oc.estado,
      productos: oc.detalles.map(d => d.productoId),
    }));

    const productosConOCAbierta = new Set(
      ordenesAbiertas.flatMap((oc) => oc.detalles.map((d) => d.productoId)),
    );

    const productos = await this.prisma.producto.findMany({
      where: {
        estado: 'ACTIVO',
      },
      include: {
        inventarios: {
          where: { sucursalId },
        },
      },
    });

    const reporteProductos = productos.map(p => {
      const existencia = p.inventarios.reduce((sum, i) => sum + i.existencia, 0);
      const existMin = p.inventarios.length > 0 ? p.inventarios.reduce((sum, i) => sum + i.existMin, 0) : 0;
      const existMax = p.inventarios.length > 0 ? p.inventarios.reduce((sum, i) => sum + i.existMax, 0) : 0;
      const esDeficit = existencia < existMin;

      const tipo = (p.tipoProducto || '').toUpperCase();
      const cat = (p.categoria || '').toUpperCase();

      const matchesTipo = ['MATERIA_PRIMA', 'INSUMO', 'MP'].includes(tipo);
      const matchesCategoria = nombresCategoriasMPUpper.has(cat) || nombresCategoriasFijasUpper.has(cat);
      const isRawMaterial = matchesTipo || matchesCategoria;
      
      const hasOC = productosConOCAbierta.has(p.id);

      return {
        id: p.id,
        sku: p.sku,
        descripcion: p.descripcion,
        categoria: p.categoria,
        tipoProducto: p.tipoProducto,
        existencia,
        existMin,
        existMax,
        esDeficit,
        isRawMaterial,
        hasOC,
        incluidoEnRequerimientos: isRawMaterial && esDeficit && !hasOC,
      };
    });

    return {
      sucursalId,
      sucursalNombre: cd.nombre,
      categoriasMP,
      ocsAbiertasInfo,
      reporteProductos: reporteProductos.filter(rp => rp.esDeficit || rp.sku === 'MP-ADI-CDC'),
    };
  }

  @Get('requerimientos')
  async obtenerRequerimientosMateriaPrima(@Request() req: any) {
    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    
    const sucursalId = cd?.id;
    if (!sucursalId) {
      throw new BadRequestException('El Centro de Distribución principal (SUC-001) no está registrado.');
    }

    // Obtener las categorías que corresponden a materia prima o insumo
    const categoriasMP = await this.prisma.categoria.findMany({
      where: {
        tipoProducto: {
          in: ['MATERIA_PRIMA', 'INSUMO', 'MP'],
        },
      },
      select: { nombre: true },
    });
    
    const nombresCategoriasMPUpper = new Set([
      ...categoriasMP.map((c) => c.nombre.toUpperCase()),
      'MATERIA_PRIMA',
      'INSUMOS',
      'INSUMO',
      'LECHE Y DERIVADOS',
      'LECHES Y DERIVADOS',
      'CULTIVOS Y FERMENTOS',
      'ADITIVOS',
      'INSUMOS'
    ]);

    // 1. Obtener todos los productos activos
    const productos = await this.prisma.producto.findMany({
      where: {
        estado: 'ACTIVO',
      },
      include: {
        inventarios: {
          where: { sucursalId },
        },
        proveedoresAsociados: {
          include: { proveedor: true },
        },
        recetasFinales: {
          select: { id: true },
        },
      },
    });

    // 2. Obtener IDs de productos con órdenes de compra abiertas (no recibidas ni canceladas)
    const ordenesAbiertas = await this.prisma.ordenCompra.findMany({
      where: {
        estado: {
          notIn: ['RECIBIDA', 'CANCELADA'],
        },
      },
      include: {
        detalles: {
          select: { productoId: true },
        },
      },
    });

    const productosConOCAbierta = new Set(
      ordenesAbiertas.flatMap((oc) => oc.detalles.map((d) => d.productoId)),
    );

    // 3. Filtrar aquellos productos bajo el mínimo y sin OCs pendientes
    const requerimientos: any[] = [];

    for (const p of productos) {
      // Filtrar por tipo de producto o categoría de materia prima
      const tipo = (p.tipoProducto || '').toUpperCase();
      const cat = (p.categoria || '').toUpperCase();
      const esMateriaPrima = ['MATERIA_PRIMA', 'INSUMO', 'MP'].includes(tipo) || nombresCategoriasMPUpper.has(cat);

      if (!esMateriaPrima) {
        continue;
      }

      if (productosConOCAbierta.has(p.id)) {
        continue;
      }

      const existencia = p.inventarios.reduce((sum, i) => sum + i.existencia, 0);
      const existMin = p.inventarios.length > 0 ? p.inventarios.reduce((sum, i) => sum + i.existMin, 0) : 0;
      const existMax = p.inventarios.length > 0 ? p.inventarios.reduce((sum, i) => sum + i.existMax, 0) : 0;

      if (existencia < existMin) {
        const provAsocPredet = p.proveedoresAsociados.find((pa) => pa.esPredeterminado) 
          || p.proveedoresAsociados[0];

        const sugerido = existMax > existencia ? (existMax - existencia) : (existMin - existencia);

        requerimientos.push({
          productoId: p.id,
          sku: p.sku,
          descripcion: p.descripcion,
          categoria: p.categoria,
          existencia,
          existMin,
          existMax,
          cantidadSugerida: sugerido,
          esManufacturado: p.esManufacturado,
          recetaId: p.recetasFinales[0]?.id || null,
          proveedorId: provAsocPredet?.proveedorId || null,
          proveedorNombre: provAsocPredet?.proveedor?.nombre || null,
          costoProveedor: provAsocPredet?.costoProveedor || p.costo,
          proveedoresAsociados: p.proveedoresAsociados.map((pa) => ({
            proveedorId: pa.proveedorId,
            nombre: pa.proveedor.nombre,
            costoProveedor: pa.costoProveedor || p.costo,
          })),
        });
      }
    }

    return requerimientos;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post('requerimientos/crear')
  async crearOrdenesCompraRequerimientos(@Request() req: any, @Body() body: any) {
    const { items, sucursalId } = body; 
    // items: [{ productoId, proveedorId, cantidad, costoUnitario }]

    if (!items || !Array.isArray(items) || items.length === 0 || !sucursalId) {
      throw new BadRequestException('La lista de ítems y la sucursal de destino son obligatorios.');
    }

    const itemsPorProveedor: Record<string, typeof items> = {};
    for (const item of items) {
      if (!item.proveedorId) {
        throw new BadRequestException(`El producto con ID ${item.productoId} no tiene un proveedor asignado.`);
      }
      if (!itemsPorProveedor[item.proveedorId]) {
        itemsPorProveedor[item.proveedorId] = [];
      }
      itemsPorProveedor[item.proveedorId].push(item);
    }

    const creadas: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [proveedorId, provItems] of Object.entries(itemsPorProveedor)) {
        const count = await tx.ordenCompra.count();
        const numeroOrden = `OC-${String(count + 1).padStart(5, '0')}`;

        const total = provItems.reduce(
          (sum, item) => sum + (item.cantidad * item.costoUnitario),
          0,
        );

        let maxFechaEntrega: Date | null = null;
        const lineasData: any[] = [];

        for (const p of provItems) {
          const prodDb = await tx.producto.findUnique({
            where: { id: p.productoId },
          });
          const leadTimeDays = prodDb?.leadTime || 0;
          const fechaEntregaLine = new Date();
          fechaEntregaLine.setHours(0, 0, 0, 0);
          fechaEntregaLine.setDate(fechaEntregaLine.getDate() + leadTimeDays);

          if (!maxFechaEntrega || fechaEntregaLine > maxFechaEntrega) {
            maxFechaEntrega = fechaEntregaLine;
          }

          lineasData.push({
            productoId: p.productoId,
            cantidad: parseFloat(p.cantidad),
            costoUnitario: parseFloat(p.costoUnitario),
            fechaEntrega: fechaEntregaLine,
          });
        }

        const cabecera = await tx.ordenCompra.create({
          data: {
            numeroOrden,
            proveedorId,
            sucursalId,
            estado: 'PENDIENTE',
            total,
            creadoPorId: req.user.id,
            fechaEntrega: maxFechaEntrega,
          },
        });

        let idx = 1;
        for (const line of lineasData) {
          await tx.ordenCompraDetalle.create({
            data: {
              ordenCompraId: cabecera.id,
              productoId: line.productoId,
              cantidad: line.cantidad,
              costoUnitario: line.costoUnitario,
              fechaEntrega: line.fechaEntrega,
              lineaNum: idx++,
            },
          });
        }

        await tx.auditoria.create({
          data: {
            usuarioId: req.user.id,
            usuarioNombre: req.user.nombre,
            accion: 'CREAR_ORDEN_COMPRA',
            modulo: 'COMPRAS',
            detalles: JSON.stringify({ id: cabecera.id, numeroOrden }),
          },
        });

        creadas.push(cabecera);
      }
    });

    return { success: true, ordenesCreadas: creadas.length, detalles: creadas };
  }

  private async obtenerBodegaParaProducto(sucursalId: string, productoId: string, tx?: any) {
    const client = tx || this.prisma;
    
    // Primero, buscar si ya existe una asociación de inventario para este producto en esta sucursal con una bodega válida
    const existingInv = await client.inventario.findFirst({
      where: {
        productoId,
        sucursalId,
        NOT: { bodegaId: null },
      },
      include: { bodega: true },
    });
    if (existingInv && existingInv.bodega) {
      return existingInv.bodega;
    }

    const sucursal = await client.sucursal.findUnique({ where: { id: sucursalId } });
    if (sucursal && sucursal.codigo === 'SUC-001') {
      const prod = await client.producto.findUnique({ where: { id: productoId } });
      if (prod) {
        let tipoBodega = 'PRODUCTO_TERMINADO';
        if (prod.tipoProducto === 'MNA' || prod.categoria === 'MNA') {
          tipoBodega = 'GENERAL';
        } else if (prod.tipoProducto === 'INSUMO' || prod.categoria === 'INSUMOS') {
          tipoBodega = 'INSUMOS';
        } else if (prod.categoria === 'QUIMICOS') {
          tipoBodega = 'QUIMICOS';
        } else if (prod.categoria === 'LABORATORIO') {
          tipoBodega = 'LABORATORIO';
        } else if (prod.sku === 'MP-LECHE-CRUDA') {
          tipoBodega = 'LECHE_ENTERA';
        } else if (prod.unidadMedida === 'UNIDAD' && (prod.sku.includes('ENV') || prod.descripcion.toLowerCase().includes('envase') || prod.descripcion.toLowerCase().includes('empaque'))) {
          tipoBodega = 'EMPAQUE';
        }
        const targetBodega = await client.bodega.findFirst({
          where: { sucursalId, tipoBodega },
        });
        if (targetBodega) return targetBodega;
      }
    }
    
    const generalBodega = await client.bodega.findFirst({
      where: { sucursalId, tipoBodega: 'GENERAL' },
    });
    if (generalBodega) return generalBodega;
    
    return client.bodega.findFirst({
      where: { sucursalId },
    });
  }
}
