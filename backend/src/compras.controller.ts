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
import { EmailService } from './email.service';

@Controller('compras')
export class ComprasController {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

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
            notas: p.notas || null,
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
              notas: p.notas || null,
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

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post(':id/enviar-correo')
  async enviarCorreoOrdenCompra(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { para: string; asunto: string; mensajeAdicional?: string },
  ) {
    const { para, asunto, mensajeAdicional } = body;
    if (!para || !asunto) {
      throw new BadRequestException('El destinatario y el asunto son obligatorios.');
    }

    const oc = await this.prisma.ordenCompra.findUnique({
      where: { id },
      include: {
        proveedor: true,
        sucursal: true,
        creadoPor: { select: { nombre: true, email: true } },
        detalles: {
          include: {
            producto: true,
          },
          orderBy: { lineaNum: 'asc' },
        },
      },
    });

    if (!oc) {
      throw new BadRequestException('La orden de compra no existe.');
    }

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);
    };

    // Generar las líneas de la tabla en HTML
    let tableRows = '';
    oc.detalles.forEach((det, idx) => {
      const lineNum = det.lineaNum || (idx + 1);
      const subtotal = det.cantidad * det.costoUnitario;
      tableRows += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; text-align: center; font-size: 13px; color: #6b7280; font-weight: bold;">L${lineNum}</td>
          <td style="padding: 12px 8px; font-size: 14px; color: #374151;">
            <div style="font-weight: 600;">${det.producto.descripcion}</div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">SKU: ${det.producto.sku}</div>
            ${det.notas ? `<div style="font-size: 12px; color: #b45309; font-style: italic; margin-top: 4px; font-weight: 500;">Nota: ${det.notas}</div>` : ''}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-size: 14px; color: #374151;">${det.cantidad}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 14px; color: #374151; text-transform: uppercase;">${det.producto.unidadMedida}</td>
          <td style="padding: 12px 8px; text-align: right; font-size: 14px; color: #374151;">${formatCurrency(det.costoUnitario)}</td>
          <td style="padding: 12px 8px; text-align: right; font-size: 14px; font-weight: 700; color: #1e3a8a;">${formatCurrency(subtotal)}</td>
        </tr>
      `;
    });

    const fechaCreacion = new Date(oc.createdAt).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const fechaEntrega = oc.fechaEntrega 
      ? new Date(oc.fechaEntrega).toLocaleDateString('es-CO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : 'No especificada';

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937; line-height: 1.5;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid #e5e7eb;">
          
          <!-- Header corporativo -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; color: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; border: none;">
              <tr style="border: none;">
                <td style="vertical-align: middle; border: none;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Lácteos MRP</h1>
                  <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1.5px;">Orden de Compra Oficial</p>
                </td>
                <td style="text-align: right; vertical-align: middle; border: none;">
                  <div style="background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 6px; display: inline-block;">
                    <span style="font-weight: 800; font-size: 16px; letter-spacing: 0.5px;">${oc.numeroOrden}</span>
                  </div>
                  <div style="margin-top: 6px; font-size: 12px; opacity: 0.85;">Estado: <span style="font-weight: 700; text-transform: uppercase;">${oc.estado}</span></div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Datos de la orden -->
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: none;">
              <tr style="border: none;">
                <td style="width: 50%; vertical-align: top; padding-right: 16px; border: none;">
                  <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">Proveedor</h3>
                  </div>
                  <div style="font-size: 14px; color: #4b5563;">
                    <strong style="color: #1f2937; font-size: 15px;">${oc.proveedor.nombre}</strong><br />
                    <span style="font-size: 12px; color: #6b7280; font-weight: 600;">Código: ${oc.proveedor.codigo}</span><br />
                    <strong>Contacto:</strong> ${oc.proveedor.contacto}<br />
                    <strong>Teléfono:</strong> ${oc.proveedor.telefono}<br />
                    <strong>Email:</strong> ${oc.proveedor.correo}
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 16px; border: none;">
                  <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">Entregar En</h3>
                  </div>
                  <div style="font-size: 14px; color: #4b5563;">
                    <strong style="color: #1f2937; font-size: 15px;">${oc.sucursal.nombre}</strong><br />
                    <strong>Dirección:</strong> ${oc.sucursal.direccion}<br />
                    <strong>Teléfono:</strong> ${oc.sucursal.telefono}<br />
                    <strong>Email:</strong> ${oc.sucursal.correo}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Fechas e info general -->
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #e2e8f0; font-size: 13px; color: #4b5563;">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr style="border: none;">
                  <td style="padding: 4px 0; border: none;"><strong>Fecha de Emisión:</strong> ${fechaCreacion}</td>
                  <td style="padding: 4px 0; text-align: right; border: none;"><strong>Fecha Estimada de Entrega:</strong> ${fechaEntrega}</td>
                </tr>
                <tr style="border: none;">
                  <td style="padding: 4px 0; border: none;"><strong>Generado Por:</strong> ${oc.creadoPor.nombre}</td>
                  <td style="padding: 4px 0; text-align: right; border: none;"><strong>Condiciones:</strong> ${oc.proveedor.bancoNombre ? 'Transferencia Bancaria' : 'Según acuerdo'}</td>
                </tr>
              </table>
            </div>

            <!-- Mensaje adicional del comprador -->
            ${mensajeAdicional ? `
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px; font-size: 14px; color: #1e40af;">
                <strong style="display: block; margin-bottom: 4px;">Instrucciones Adicionales:</strong>
                ${mensajeAdicional}
              </div>
            ` : ''}

            <!-- Tabla de productos -->
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">Detalle de Productos Solicitados</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 50px;">Línea</th>
                  <th style="padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase;">Producto / Descripción</th>
                  <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 60px;">Cant.</th>
                  <th style="padding: 10px 8px; text-align: center; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 60px;">U.M.</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 100px;">Costo Unit.</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; width: 110px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <!-- Resumen de total -->
            <table style="width: 100%; border-collapse: collapse; border: none; margin-top: 12px;">
              <tr style="border: none;">
                <td style="width: 60%; border: none;">
                  ${oc.proveedor.bancoNombre ? `
                    <div style="font-size: 12px; color: #6b7280; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; max-width: 320px;">
                      <strong style="color: #4b5563; display: block; margin-bottom: 2px;">Datos de Transferencia del Proveedor:</strong>
                      Banco: ${oc.proveedor.bancoNombre}<br />
                      Tipo: ${oc.proveedor.bancoTipoCuenta || 'Corriente'}<br />
                      Cuenta N°: ${oc.proveedor.bancoNroCuenta}<br />
                      Titular: ${oc.proveedor.bancoNomTitular || oc.proveedor.nombre}
                    </div>
                  ` : ''}
                </td>
                <td style="width: 40%; text-align: right; vertical-align: top; border: none;">
                  <table style="width: 100%; border-collapse: collapse; border: none;">
                    <tr style="border: none;">
                      <td style="padding: 4px 0; font-size: 14px; color: #6b7280; border: none;">Subtotal:</td>
                      <td style="padding: 4px 0; font-size: 14px; color: #1f2937; text-align: right; border: none;">${formatCurrency(oc.total)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #1e3a8a; border-bottom: none; border-left: none; border-right: none;">
                      <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #1e3a8a; border: none;">TOTAL:</td>
                      <td style="padding: 12px 0 0 0; font-size: 20px; font-weight: 800; color: #1e3a8a; text-align: right; border: none;">${formatCurrency(oc.total)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>

          <!-- Footer/Disclaimer -->
          <div style="padding: 24px; text-align: center; font-size: 11px; color: #9ca3af; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0 0 6px 0;">Esta orden de compra es emitida por Lácteos MRP de manera oficial. Por favor, confirme el recibo de este correo y procese el despacho según la fecha acordada.</p>
            <p style="margin: 0; font-weight: 600;">Lácteos MRP © 2026. Todos los derechos reservados.</p>
          </div>

        </div>
      </div>
    `;

    await this.emailService.enviarCorreo(para, asunto, emailHtml);

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ENVIAR_CORREO_ORDEN_COMPRA',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ id, numeroOrden: oc.numeroOrden, enviadoA: para }),
      },
    });

    return { success: true, message: `Orden de compra enviada con éxito a ${para}.` };
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
