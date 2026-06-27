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

        // Upsert en inventario
        await tx.inventario.upsert({
          where: {
            productoId_sucursalId: {
              productoId: loteInfo.productoId,
              sucursalId: oc.sucursalId,
            },
          },
          update: { existencia: { increment: cantidadRecibidaAhora } },
          create: {
            productoId: loteInfo.productoId,
            sucursalId: oc.sucursalId,
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
    const { proveedorId, sucursalId, productos, fechaEntrega } = body;

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

    if (oc.estado === 'RECIBIDA' || oc.estado === 'PARCIAL') {
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

  @Get('requerimientos')
  async obtenerRequerimientosMateriaPrima(@Request() req: any) {
    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    
    const sucursalId = cd?.id;
    if (!sucursalId) {
      throw new BadRequestException('El Centro de Distribución principal (SUC-001) no está registrado.');
    }

    // 1. Obtener todos los productos del tipo MATERIA_PRIMA, INSUMO o MP
    const productos = await this.prisma.producto.findMany({
      where: {
        tipoProducto: {
          in: ['MATERIA_PRIMA', 'INSUMO', 'MP'],
        },
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
      if (productosConOCAbierta.has(p.id)) {
        continue;
      }

      const inv = p.inventarios[0];
      const existencia = inv ? inv.existencia : 0;
      const existMin = inv ? inv.existMin : 0;
      const existMax = inv ? inv.existMax : 0;

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

        const cabecera = await tx.ordenCompra.create({
          data: {
            numeroOrden,
            proveedorId,
            sucursalId,
            estado: 'PENDIENTE',
            total,
            creadoPorId: req.user.id,
          },
        });

        let idx = 1;
        for (const p of provItems) {
          await tx.ordenCompraDetalle.create({
            data: {
              ordenCompraId: cabecera.id,
              productoId: p.productoId,
              cantidad: parseFloat(p.cantidad),
              costoUnitario: parseFloat(p.costoUnitario),
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
}
