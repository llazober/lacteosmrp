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

@Controller('produccion')
export class ProduccionController {
  constructor(private prisma: PrismaService) {}

  // --- RECETAS ---
  @Get('recetas')
  async listarRecetas() {
    return this.prisma.receta.findMany({
      include: {
        productoFinal: true,
        detalles: {
          include: { producto: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('recetas')
  async crearReceta(@Request() req: any, @Body() body: any) {
    const {
      nombre,
      descripcion,
      productoFinalId,
      cantidadEsperada,
      costoEstimado,
      detalles,
    } = body;

    if (
      !nombre ||
      !productoFinalId ||
      !detalles ||
      !Array.isArray(detalles) ||
      detalles.length === 0
    ) {
      throw new BadRequestException(
        'El nombre, el producto final y al menos un ingrediente/insumo son obligatorios.',
      );
    }

    const exist = await this.prisma.receta.findUnique({ where: { nombre } });
    if (exist) {
      throw new BadRequestException('Ya existe una receta con este nombre.');
    }

    const receta = await this.prisma.$transaction(async (tx) => {
      const r = await tx.receta.create({
        data: {
          nombre,
          descripcion,
          productoFinalId,
          cantidadEsperada: parseFloat(cantidadEsperada || 1),
          costoEstimado: parseFloat(costoEstimado || 0),
        },
      });

      for (const item of detalles) {
        await tx.recetaDetalle.create({
          data: {
            recetaId: r.id,
            productoId: item.productoId,
            cantidadRequerida: parseFloat(item.cantidadRequerida),
          },
        });
      }

      return r;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_RECETA',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(receta),
      },
    });

    return receta;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('recetas/:id')
  async actualizarReceta(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const {
      nombre,
      descripcion,
      productoFinalId,
      cantidadEsperada,
      costoEstimado,
      detalles,
    } = body;

    const receta = await this.prisma.$transaction(async (tx) => {
      const r = await tx.receta.update({
        where: { id },
        data: {
          nombre,
          descripcion,
          productoFinalId,
          cantidadEsperada:
            cantidadEsperada != null ? parseFloat(cantidadEsperada) : undefined,
          costoEstimado:
            costoEstimado != null ? parseFloat(costoEstimado) : undefined,
        },
      });

      if (detalles && Array.isArray(detalles)) {
        // Borrar antiguos detalles y crear nuevos
        await tx.recetaDetalle.deleteMany({ where: { recetaId: id } });
        for (const item of detalles) {
          await tx.recetaDetalle.create({
            data: {
              recetaId: id,
              productoId: item.productoId,
              cantidadRequerida: parseFloat(item.cantidadRequerida),
            },
          });
        }
      }

      return r;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_RECETA',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(receta),
      },
    });

    return receta;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Delete('recetas/:id')
  async eliminarReceta(@Param('id') id: string, @Request() req: any) {
    const check = await this.prisma.ordenProduccion.count({
      where: { recetaId: id },
    });
    if (check > 0) {
      throw new BadRequestException(
        'No se puede eliminar la receta porque posee órdenes de producción asociadas.',
      );
    }

    const receta = await this.prisma.receta.findUnique({ where: { id } });
    await this.prisma.receta.delete({ where: { id } });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_RECETA',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(receta),
      },
    });

    return { success: true, message: 'Receta eliminada con éxito.' };
  }

  // --- ÓRDENES DE PRODUCCIÓN ---
  @Get('ordenes')
  async listarOrdenes() {
    return this.prisma.ordenProduccion.findMany({
      include: {
        receta: {
          include: { productoFinal: true },
        },
        sucursal: true,
        creadoPor: true,
        responsable: true,
        detalles: {
          include: { producto: true },
        },
        mermas: {
          include: { producto: true },
        },
        inspecciones: true,
        lotesProducidos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes')
  async crearOrdenProduccion(@Request() req: any, @Body() body: any) {
    const { recetaId, sucursalId, cantidadPlanificada, responsableId } = body;

    if (!recetaId || !sucursalId || !cantidadPlanificada || !responsableId) {
      throw new BadRequestException(
        'Todos los campos de la orden (receta, sucursal, cantidad planificada y responsable) son obligatorios.',
      );
    }

    const count = await this.prisma.ordenProduccion.count();
    const numeroOrden = `OP-${String(count + 1).padStart(6, '0')}`;

    const op = await this.prisma.ordenProduccion.create({
      data: {
        numeroOrden,
        recetaId,
        sucursalId,
        cantidadPlanificada: parseFloat(cantidadPlanificada),
        creadoPorId: req.user.id,
        responsableId,
        estado: 'PLANIFICADA',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_ORDEN_PRODUCCION',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(op),
      },
    });

    return op;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes/:id/iniciar')
  async iniciarOrden(@Param('id') id: string, @Request() req: any) {
    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: { receta: { include: { detalles: true } } },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }
    if (op.estado !== 'PLANIFICADA') {
      if (op.estado === 'FALTANTES') {
        throw new BadRequestException(
          'No se puede iniciar una orden con faltantes de materia prima (Shortages).',
        );
      }
      throw new BadRequestException(
        'Solo se pueden iniciar órdenes en estado PLANIFICADA.',
      );
    }

    const updated = await this.prisma.ordenProduccion.update({
      where: { id },
      data: {
        estado: 'EN_PROCESO',
        fechaInicio: new Date(),
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'INICIAR_ORDEN_PRODUCCION',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(updated),
      },
    });

    return updated;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes/:id/completar')
  async completarOrden(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { cantidadProducida, loteNumero, mermas } = body;

    if (cantidadProducida == null || !loteNumero) {
      throw new BadRequestException(
        'La cantidad producida y el número de lote son obligatorios.',
      );
    }

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            productoFinal: true,
            detalles: true,
          },
        },
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }
    if (op.estado !== 'EN_PROCESO') {
      throw new BadRequestException(
        'Solo se pueden completar órdenes en estado EN_PROCESO.',
      );
    }

    // Buscar proveedor interno o primer proveedor para asociar al lote producido
    let proveedor = await this.prisma.proveedor.findFirst({
      where: { codigo: 'INTERNO' },
    });
    if (!proveedor) {
      proveedor = await this.prisma.proveedor.findFirst();
      if (!proveedor) {
        throw new BadRequestException(
          'Debe registrar al menos un proveedor en el sistema antes de generar lotes de producción.',
        );
      }
    }

    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }
    const cdId = cd.id;

    const result = await this.prisma.$transaction(async (tx) => {
      const cantProd = parseFloat(cantidadProducida);
      const cantPlan = op.cantidadPlanificada;
      const rendimientoReal = cantPlan > 0 ? (cantProd / cantPlan) * 100 : 100;
      const variacion = cantProd - cantPlan;

      // 1. Descontar materias primas mediante FEFO (solo si no se completó en la fase de picking)
      if (!op.pickingCompletado) {
        for (const reqDetalle of op.receta.detalles) {
          // Multiplicar la cantidad requerida por la cantidad planificada o producida (escalado)
          const totalRequerido = reqDetalle.cantidadRequerida * cantPlan;
          let pendientePorDescontar = totalRequerido;

          // Buscar lotes de este ingrediente que estén APROBADOS, con stock, ordenados por vencimiento (FEFO)
          const lotesDisponibles = await tx.lote.findMany({
            where: {
              productoId: reqDetalle.productoId,
              cantidadActual: { gt: 0 },
              estado: 'APROBADO',
            },
            orderBy: { fechaVencimiento: 'asc' },
          });

          for (const lote of lotesDisponibles) {
            if (pendientePorDescontar <= 0) break;

            const aDescontar = Math.min(
              lote.cantidadActual,
              pendientePorDescontar,
            );

            // Descontar del lote
            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: { decrement: aDescontar } },
            });

            // Registrar detalle consumido
            await tx.ordenProduccionDetalle.create({
              data: {
                ordenProduccionId: op.id,
                productoId: reqDetalle.productoId,
                loteId: lote.id,
                cantidadConsumida: aDescontar,
              },
            });

            // Registrar Movimiento de inventario
            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: reqDetalle.productoId,
                loteId: lote.id,
                sucursalOrigenId: cdId,
                cantidad: aDescontar,
                motivo: `Consumo materia prima en Orden de Producción ${op.numeroOrden}`,
                usuarioId: req.user.id,
              },
            });

            pendientePorDescontar -= aDescontar;
          }

          // Si faltó stock y no se cubrió todo, descontar del inventario general (permitiendo negativos o lanzando error)
          // Para este ERP robusto, descontamos el total del Inventario de la sucursal
          const inv = await tx.inventario.findUnique({
            where: {
              productoId_sucursalId: {
                productoId: reqDetalle.productoId,
                sucursalId: cdId,
              },
            },
          });

          if (inv) {
            await tx.inventario.update({
              where: { id: inv.id },
              data: { existencia: { decrement: totalRequerido } },
            });
          } else {
            await tx.inventario.create({
              data: {
                productoId: reqDetalle.productoId,
                sucursalId: cdId,
                existencia: -totalRequerido,
              },
            });
          }
        }
      }

      // 2. Registrar mermas si las hay
      if (mermas && Array.isArray(mermas)) {
        for (const m of mermas) {
          await tx.merma.create({
            data: {
              ordenProduccionId: op.id,
              productoId: m.productoId,
              cantidad: parseFloat(m.cantidad),
              motivo: m.motivo || 'PROCESO',
              responsableId: req.user.id,
            },
          });

          // Descontar inventario de la merma de materia prima si no se descontó en FEFO
          const invM = await tx.inventario.findUnique({
            where: {
              productoId_sucursalId: {
                productoId: m.productoId,
                sucursalId: cdId,
              },
            },
          });
          if (invM) {
            await tx.inventario.update({
              where: { id: invM.id },
              data: { existencia: { decrement: parseFloat(m.cantidad) } },
            });
          }
        }
      }

      // 3. Crear o actualizar Lote para el producto terminado producido
      const vidaUtil = op.receta.productoFinal.vidaUtilDias || 30;
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + vidaUtil);

      const existingLote = await tx.lote.findFirst({
        where: {
          OR: [
            { ordenProduccionId: op.id },
            { numeroLote: loteNumero }
          ]
        },
      });

      let nuevoLote;
      if (existingLote) {
        nuevoLote = await tx.lote.update({
          where: { id: existingLote.id },
          data: {
            numeroLote: loteNumero,
            fechaProduccion: new Date(),
            fechaVencimiento: fechaVen,
            cantidadInicial: cantProd,
            cantidadActual: cantProd,
            estado: 'APROBADO',
            ordenProduccionId: op.id,
          },
        });
      } else {
        nuevoLote = await tx.lote.create({
          data: {
            numeroLote: loteNumero,
            productoId: op.receta.productoFinalId,
            fechaProduccion: new Date(),
            fechaVencimiento: fechaVen,
            proveedorId: proveedor.id,
            temperaturaRequeridaMin: op.receta.productoFinal.temperaturaMin || 2,
            temperaturaRequeridaMax: op.receta.productoFinal.temperaturaMax || 6,
            cantidadInicial: cantProd,
            cantidadActual: cantProd,
            estado: 'APROBADO',
            ordenProduccionId: op.id,
          },
        });
      }

      // 4. Incrementar inventario del producto terminado
      const invFinal = await tx.inventario.findUnique({
        where: {
          productoId_sucursalId: {
            productoId: op.receta.productoFinalId,
            sucursalId: cdId,
          },
        },
      });

      if (invFinal) {
        await tx.inventario.update({
          where: { id: invFinal.id },
          data: { existencia: { increment: cantProd } },
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId: op.receta.productoFinalId,
            sucursalId: cdId,
            existencia: cantProd,
          },
        });
      }

      // Registrar movimiento de inventario de entrada
      await tx.movimientoInventario.create({
        data: {
          tipo: 'ENTRADA',
          productoId: op.receta.productoFinalId,
          loteId: nuevoLote.id,
          sucursalDestinoId: cdId,
          cantidad: cantProd,
          motivo: `Ingreso por Producción finalizada Orden ${op.numeroOrden}`,
          usuarioId: req.user.id,
        },
      });

      // 5. Actualizar estado de la Orden de Producción
      const opUpdated = await tx.ordenProduccion.update({
        where: { id: op.id },
        data: {
          estado: 'COMPLETADA',
          cantidadProducida: cantProd,
          rendimientoReal,
          variacion,
          fechaFin: new Date(),
        },
      });

      return opUpdated;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'COMPLETAR_ORDEN_PRODUCCION',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(result),
      },
    });

    return result;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes/:id/cancelar')
  async cancelarOrden(@Param('id') id: string, @Request() req: any) {
    const op = await this.prisma.ordenProduccion.findUnique({ where: { id } });
    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }
    if (op.estado === 'COMPLETADA' || op.estado === 'CANCELADA') {
      throw new BadRequestException(
        'No se puede cancelar una orden ya completada o cancelada.',
      );
    }

    const updated = await this.prisma.ordenProduccion.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        fechaFin: new Date(),
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CANCELAR_ORDEN_PRODUCCION',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(updated),
      },
    });

    return updated;
  }

  // --- MERMAS GENERALES ---
  @Get('mermas')
  async listarMermas() {
    return this.prisma.merma.findMany({
      include: {
        producto: true,
        responsable: true,
        ordenProduccion: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('mermas')
  async crearMerma(@Request() req: any, @Body() body: any) {
    const { productoId, cantidad, motivo, sucursalId } = body;
    if (!productoId || !cantidad || !motivo || !sucursalId) {
      throw new BadRequestException(
        'El producto, la cantidad, el motivo y la sucursal son obligatorios.',
      );
    }

    const merma = await this.prisma.$transaction(async (tx) => {
      const m = await tx.merma.create({
        data: {
          productoId,
          cantidad: parseFloat(cantidad),
          motivo,
          responsableId: req.user.id,
        },
      });

      // Descontar inventario general de la sucursal
      const inv = await tx.inventario.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId } },
      });

      if (inv) {
        await tx.inventario.update({
          where: { id: inv.id },
          data: { existencia: { decrement: parseFloat(cantidad) } },
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId,
            sucursalId,
            existencia: -parseFloat(cantidad),
          },
        });
      }

      // Registrar movimiento de inventario de salida
      await tx.movimientoInventario.create({
        data: {
          tipo: 'SALIDA',
          productoId,
          sucursalOrigenId: sucursalId,
          cantidad: parseFloat(cantidad),
          motivo: `Registro de Merma: ${motivo}`,
          usuarioId: req.user.id,
        },
      });

      return m;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_MERMA',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(merma),
      },
    });

    return merma;
  }

  // --- PLANIFICACIÓN DE LA PRODUCCIÓN ---
  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Get('planificacion/calcular')
  async calcularPlanificacion(@Query('useSafetyStockMin') useSafetyStockMin?: string) {
    const useSafety = useSafetyStockMin === 'true';

    // 1. Obtener todas las sucursales (excluyendo Planta de Producción Principal)
    const sucursales = await this.prisma.sucursal.findMany({
      where: { estado: 'ACTIVO' },
    });
    const plantaPrincipal = sucursales.find((s) => s.codigo === 'SUC-001');
    if (!plantaPrincipal) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }

    // 2. Obtener recetas y mapear los productos finales que tienen receta configurada
    const recetas = await this.prisma.receta.findMany({
      include: {
        productoFinal: true,
      },
    });
    const productoIdsConReceta = recetas.map((r) => r.productoFinalId);

    // 3. Obtener productos de marca "Lácteos ERP" y tipo "PRODUCTO_TERMINADO" o "PT" que tengan receta
    const productos = await this.prisma.producto.findMany({
      where: {
        id: { in: productoIdsConReceta },
        estado: 'ACTIVO',
        tipoProducto: { in: ['PRODUCTO_TERMINADO', 'PT'] },
        marca: 'Lácteos ERP',
      },
    });

    // 3.5. Obtener total de órdenes de producción abiertas en el CD (PLANIFICADA o EN_PROCESO) para descontar de las sugerencias
    const openCDOrders = await this.prisma.ordenProduccion.findMany({
      where: {
        sucursalId: plantaPrincipal.id,
        estado: { in: ['PLANIFICADA', 'EN_PROCESO'] },
      },
      include: {
        receta: true,
      },
    });

    const remainingOpenCDQtyMap: Record<string, number> = {};
    for (const prod of productos) {
      const prodOrders = openCDOrders.filter((o) => o.receta.productoFinalId === prod.id);
      remainingOpenCDQtyMap[prod.id] = prodOrders.reduce((sum, o) => sum + o.cantidadPlanificada, 0);
    }

    const propuestas: any[] = [];
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 4. Calcular para cada sucursal y cada producto de forma directa
    for (const suc of sucursales) {
      for (const prod of productos) {
        // A. Inventario en sucursal
        const inv = await this.prisma.inventario.findUnique({
          where: {
            productoId_sucursalId: { productoId: prod.id, sucursalId: suc.id },
          },
        });
        const stockActual = inv ? inv.existencia : 0;

        // B. Transferencias en tránsito
        const transferenciasPendientes = await this.prisma.transferenciaDetalle.findMany({
          where: {
            productoId: prod.id,
            transferencia: {
              destinoId: suc.id,
              estado: { in: ['PENDIENTE', 'EN_TRANSITO'] },
            },
          },
          select: { cantidad: true },
        });
        const stockEnTransito = transferenciasPendientes.reduce((sum, item) => sum + item.cantidad, 0);

        // C. Órdenes de producción abiertas asignadas a esta sucursal (si existen)
        const openBranchOrders = await this.prisma.ordenProduccion.findMany({
          where: {
            sucursalId: suc.id,
            receta: { productoFinalId: prod.id },
            estado: { in: ['PLANIFICADA', 'EN_PROCESO'] },
          },
          select: { cantidadPlanificada: true },
        });
        const openBranchQty = openBranchOrders.reduce((sum, o) => sum + o.cantidadPlanificada, 0);

        const stockDisponible = stockActual + stockEnTransito + openBranchQty;

        // D. Ventas promedio diarias (últimos 30 días)
        const ventasDetalle = await this.prisma.ventaDetalle.findMany({
          where: {
            productoId: prod.id,
            venta: {
              sucursalId: suc.id,
              fecha: { gte: hace30Dias },
              estado: 'COMPLETADA',
            },
          },
          select: { cantidad: true },
        });
        const totalVendido = ventasDetalle.reduce((sum, item) => sum + item.cantidad, 0);
        const promedioVentasDiarias = totalVendido > 0 ? totalVendido / 30 : 2.0;

        const diasInventario = promedioVentasDiarias > 0 ? stockDisponible / promedioVentasDiarias : 0;

        // E. Determinar Stock Objetivo
        let diasObjetivo = 5;
        if (prod.categoria === 'YOGURT') diasObjetivo = 7;
        else if (prod.categoria === 'QUESOS') diasObjetivo = 10;
        else if (prod.categoria === 'MANTEQUILLA') diasObjetivo = 15;

        let stockObjetivo = promedioVentasDiarias * diasObjetivo;
        if (useSafety) {
          const stockMinimoSeguridad = inv ? inv.existMin : 5;
          stockObjetivo = Math.max(stockObjetivo, stockMinimoSeguridad);
        }

        // F. Calcular necesidad
        if (stockDisponible < stockObjetivo) {
          const deficit = stockObjetivo - stockDisponible;

          // Descontar del pool de órdenes abiertas del CD
          let cantidadSugerida = 0;
          const openCDPool = remainingOpenCDQtyMap[prod.id] || 0;
          if (openCDPool >= deficit) {
            remainingOpenCDQtyMap[prod.id] -= deficit;
            cantidadSugerida = 0;
          } else {
            cantidadSugerida = deficit - openCDPool;
            remainingOpenCDQtyMap[prod.id] = 0;
          }

          const cantidadSugeridaCeil = Math.ceil(cantidadSugerida);

          if (cantidadSugeridaCeil > 0) {
            const receta = recetas.find((r) => r.productoFinalId === prod.id);
            propuestas.push({
              sucursalId: suc.id,
              sucursalNombre: suc.nombre,
              productoId: prod.id,
              productoSku: prod.sku,
              productoNombre: prod.descripcion,
              recetaId: receta ? receta.id : null,
              recetaNombre: receta ? receta.nombre : 'Sin Receta',
              stockActual: parseFloat(stockActual.toFixed(2)),
              promedioVentasDiarias: parseFloat(promedioVentasDiarias.toFixed(2)),
              diasInventario: parseFloat(diasInventario.toFixed(1)),
              stockObjetivo: parseFloat(stockObjetivo.toFixed(1)),
              stockEnTransito: parseFloat(stockEnTransito.toFixed(2)),
              openBranchQty: parseFloat(openBranchQty.toFixed(2)),
              cantidadSugerida: cantidadSugeridaCeil,
              detalleRazon: `Déficit en sucursal ${suc.nombre} (${deficit.toFixed(1)} u).`,
              alertaRiesgo: diasInventario <= 2 ? 'CRITICO' : 'STOCK_BAJO',
            });
          }
        }
      }
    }

    return propuestas;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('planificacion/procesar')
  async procesarPlanificacion(@Request() req: any, @Body() body: any) {
    const { propuestas } = body;
    if (!propuestas || !Array.isArray(propuestas)) {
      throw new BadRequestException('Propuestas debe ser una lista válida.');
    }

    // 1. Obtener Planta Principal SUC-001
    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción Principal (SUC-001).');
    }

    // 2. Buscar proveedor interno
    let proveedor = await this.prisma.proveedor.findFirst({
      where: { codigo: 'INTERNO' },
    });
    if (!proveedor) {
      proveedor = await this.prisma.proveedor.findFirst();
      if (!proveedor) {
        throw new BadRequestException(
          'Debe registrar al menos un proveedor en el sistema antes de generar lotes.',
        );
      }
    }

    // 3. Agrupar propuestas por productoId
    const agrupado: Record<string, number> = {};
    for (const prop of propuestas) {
      const pId = prop.productoId;
      const qty = parseFloat(prop.cantidadSugerida);
      if (pId && qty > 0) {
        agrupado[pId] = (agrupado[pId] || 0) + qty;
      }
    }

    const resultados: any[] = [];

    // 4. Ejecutar transacciones por cada grupo
    await this.prisma.$transaction(async (tx) => {
      for (const [productoId, totalAProducir] of Object.entries(agrupado)) {
        // Buscar receta
        const receta = await tx.receta.findFirst({
          where: { productoFinalId: productoId },
          include: { productoFinal: true },
        });

        if (!receta) {
          resultados.push({
            productoId,
            estado: 'ERROR',
            mensaje: `No existe receta configurada para este producto.`,
          });
          continue;
        }

        const prod = receta.productoFinal;

        // Generar código OP y lote
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const timestamp = Date.now().toString().substring(8);
        const numeroOrden = `OP-PLAN-${timestamp}-${randomSuffix}`;
        const d = new Date();
        const yy = d.getUTCFullYear().toString().substring(2);
        const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const dd = d.getUTCDate().toString().padStart(2, '0');
        const loteNumero = `L${yy}${mm}${dd}${randomSuffix}`;

        // Crear Orden de Producción
        const op = await tx.ordenProduccion.create({
          data: {
            numeroOrden,
            recetaId: receta.id,
            sucursalId: cd.id, // Se planifica en la planta principal
            cantidadPlanificada: totalAProducir,
            estado: 'PLANIFICADA',
            creadoPorId: req.user.id,
            responsableId: req.user.id,
          },
        });

        // Crear Lote con cantidadActual: 0
        const vidaUtil = prod.vidaUtilDias || 30;
        const fechaVen = new Date();
        fechaVen.setDate(fechaVen.getDate() + vidaUtil);

        const nuevoLote = await tx.lote.create({
          data: {
            numeroLote: loteNumero,
            productoId: productoId,
            fechaProduccion: new Date(),
            fechaVencimiento: fechaVen,
            proveedorId: proveedor.id,
            temperaturaRequeridaMin: prod.temperaturaMin || 2.0,
            temperaturaRequeridaMax: prod.temperaturaMax || 6.0,
            cantidadInicial: totalAProducir,
            cantidadActual: 0,
            estado: 'APROBADO',
            ordenProduccionId: op.id,
          },
        });

        resultados.push({
          sku: prod.sku,
          nombre: prod.descripcion,
          totalAProducir,
          numeroOrden,
          loteNumero,
          estado: 'OK',
          mensaje: `Planificado: OP ${numeroOrden} y Lote ${loteNumero} creados con éxito.`,
        });

        // Auditoría por transacción
        await tx.auditoria.create({
          data: {
            usuarioId: req.user.id,
            usuarioNombre: req.user.nombre,
            accion: 'PLANIFICAR_PRODUCCION_AUTO',
            modulo: 'PRODUCCION',
            detalles: JSON.stringify({
              ordenId: op.id,
              numeroOrden,
              loteId: nuevoLote.id,
              loteNumero,
              cantidadPlanificada: totalAProducir,
            }),
          },
        });
      }
    });

    return resultados;
  }

  @Get('ordenes/:id/picking')
  async obtenerPicking(@Param('id') id: string) {
    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            detalles: {
              include: {
                producto: true,
              },
            },
          },
        },
        sucursal: true,
        detalles: true,
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }
    const cdId = cd.id;

    const ingredientes: any[] = [];
    for (const reqDetalle of op.receta.detalles) {
      const cantidadRequerida = reqDetalle.cantidadRequerida * op.cantidadPlanificada;

      const inv = await this.prisma.inventario.findUnique({
        where: {
          productoId_sucursalId: {
            productoId: reqDetalle.productoId,
            sucursalId: cdId,
          },
        },
      });
      const stockDisponible = inv ? inv.existencia : 0;

      const consumidoRecords = op.detalles.filter((d) => d.productoId === reqDetalle.productoId);
      const cantidadPicked = consumidoRecords.length > 0
        ? consumidoRecords.reduce((sum, r) => sum + r.cantidadConsumida, 0)
        : cantidadRequerida;

      let loteNumero = '';
      if (consumidoRecords.length > 0 && consumidoRecords[0].loteId) {
        const pickedLote = await this.prisma.lote.findUnique({
          where: { id: consumidoRecords[0].loteId },
        });
        if (pickedLote) {
          loteNumero = pickedLote.numeroLote;
        }
      }

      const lotes = await this.prisma.lote.findMany({
        where: {
          productoId: reqDetalle.productoId,
          cantidadActual: { gt: 0 },
          estado: 'APROBADO',
        },
        orderBy: { fechaVencimiento: 'asc' },
      });

      ingredientes.push({
        productoId: reqDetalle.productoId,
        sku: reqDetalle.producto.sku,
        descripcion: reqDetalle.producto.descripcion,
        unidadMedida: reqDetalle.producto.unidadMedida || 'U',
        cantidadRequerida: parseFloat(cantidadRequerida.toFixed(2)),
        stockDisponible: parseFloat(stockDisponible.toFixed(2)),
        cantidadPicked: parseFloat(cantidadPicked.toFixed(2)),
        picked: op.pickingCompletado,
        loteNumero,
        lotesDisponibles: lotes.map((l) => ({
          id: l.id,
          numeroLote: l.numeroLote,
          cantidadActual: l.cantidadActual,
        })),
      });
    }

    return {
      id: op.id,
      numeroOrden: op.numeroOrden,
      recetaNombre: op.receta.nombre,
      sucursalNombre: op.sucursal.nombre,
      cantidadPlanificada: op.cantidadPlanificada,
      pickingCompletado: op.pickingCompletado,
      estado: op.estado,
      ingredientes,
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes/:id/picking')
  async confirmarPicking(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { detalles } = body;
    if (!detalles || !Array.isArray(detalles)) {
      throw new BadRequestException('Los detalles del picking son obligatorios.');
    }

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            detalles: {
              include: { producto: true },
            },
          },
        },
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }
    const cdId = cd.id;

    if (op.estado !== 'PLANIFICADA' && op.estado !== 'FALTANTES') {
      throw new BadRequestException(
        'Solo se puede realizar picking en órdenes con estado PLANIFICADA o FALTANTES.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar cualquier detalle previo y devolver inventario antes de recalcular
      const detallesPrevios = await tx.ordenProduccionDetalle.findMany({
        where: { ordenProduccionId: op.id },
      });

      for (const det of detallesPrevios) {
        if (det.loteId) {
          await tx.lote.update({
            where: { id: det.loteId },
            data: { cantidadActual: { increment: det.cantidadConsumida } },
          });
        }

        const invGen = await tx.inventario.findUnique({
          where: { productoId_sucursalId: { productoId: det.productoId, sucursalId: cdId } },
        });
        if (invGen) {
          await tx.inventario.update({
            where: { id: invGen.id },
            data: { existencia: { increment: det.cantidadConsumida } },
          });
        }

        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: det.productoId,
            loteId: det.loteId,
            sucursalDestinoId: cdId,
            cantidad: det.cantidadConsumida,
            motivo: `Reversión de picking previo para re-procesar en Orden ${op.numeroOrden}`,
            usuarioId: req.user.id,
          },
        });
      }

      await tx.ordenProduccionDetalle.deleteMany({
        where: { ordenProduccionId: op.id },
      });

      // 2. Procesar el picking actual
      let tieneShortage = false;

      for (const reqDetalle of op.receta.detalles) {
        const itemPicking = detalles.find((d: any) => d.productoId === reqDetalle.productoId);
        const cantidadRequerida = reqDetalle.cantidadRequerida * op.cantidadPlanificada;

        if (!itemPicking || !itemPicking.picked) {
          tieneShortage = true;
          continue;
        }

        const cantidadAPreparar = parseFloat(itemPicking.cantidadPicked || 0);
        if (cantidadAPreparar < cantidadRequerida) {
          tieneShortage = true;
        }

        let pendientePorDescontar = cantidadAPreparar;

        // A: Si se escaneó/seleccionó un lote específico, descontar primero de ese lote
        if (itemPicking.loteNumero) {
          const lote = await tx.lote.findFirst({
            where: {
              numeroLote: itemPicking.loteNumero,
              productoId: reqDetalle.productoId,
            },
          });

          if (!lote) {
            throw new BadRequestException(
              `El lote escaneado "${itemPicking.loteNumero}" no existe o no corresponde al ingrediente "${reqDetalle.producto.descripcion}".`,
            );
          }

          if (lote.estado !== 'APROBADO') {
            throw new BadRequestException(
              `El lote "${itemPicking.loteNumero}" no está APROBADO (Estado actual: ${lote.estado}).`,
            );
          }

          const aDescontar = Math.min(lote.cantidadActual, pendientePorDescontar);
          if (aDescontar > 0) {
            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: { decrement: aDescontar } },
            });

            await tx.ordenProduccionDetalle.create({
              data: {
                ordenProduccionId: op.id,
                productoId: reqDetalle.productoId,
                loteId: lote.id,
                cantidadConsumida: aDescontar,
              },
            });

            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: reqDetalle.productoId,
                loteId: lote.id,
                sucursalOrigenId: cdId,
                cantidad: aDescontar,
                motivo: `Picking de lote escaneado ${lote.numeroLote} en Orden de Producción ${op.numeroOrden}`,
                usuarioId: req.user.id,
              },
            });

            pendientePorDescontar -= aDescontar;
          }
        }

        // B: Si aún queda cantidad pendiente por descontar, aplicar FEFO sobre los demás lotes
        const lotesDisponibles = await tx.lote.findMany({
          where: {
            productoId: reqDetalle.productoId,
            cantidadActual: { gt: 0 },
            estado: 'APROBADO',
            NOT: itemPicking.loteNumero ? { numeroLote: itemPicking.loteNumero } : undefined,
          },
          orderBy: { fechaVencimiento: 'asc' },
        });

        for (const lote of lotesDisponibles) {
          if (pendientePorDescontar <= 0) break;

          const aDescontar = Math.min(lote.cantidadActual, pendientePorDescontar);

          // Descontar del lote
          await tx.lote.update({
            where: { id: lote.id },
            data: { cantidadActual: { decrement: aDescontar } },
          });

          // Registrar detalle consumido en la orden
          await tx.ordenProduccionDetalle.create({
            data: {
              ordenProduccionId: op.id,
              productoId: reqDetalle.productoId,
              loteId: lote.id,
              cantidadConsumida: aDescontar,
            },
          });

          // Registrar Movimiento de inventario
          await tx.movimientoInventario.create({
            data: {
              tipo: 'SALIDA',
              productoId: reqDetalle.productoId,
              loteId: lote.id,
              sucursalOrigenId: cdId,
              cantidad: aDescontar,
              motivo: `Picking de materia prima en Orden de Producción ${op.numeroOrden}`,
              usuarioId: req.user.id,
            },
          });

          pendientePorDescontar -= aDescontar;
        }

        // Si faltó stock en lotes
        if (pendientePorDescontar > 0) {
          tieneShortage = true;

          const inv = await tx.inventario.findUnique({
            where: {
              productoId_sucursalId: {
                productoId: reqDetalle.productoId,
                sucursalId: cdId,
              },
            },
          });

          if (inv) {
            await tx.inventario.update({
              where: { id: inv.id },
              data: { existencia: { decrement: pendientePorDescontar } },
            });
          } else {
            await tx.inventario.create({
              data: {
                productoId: reqDetalle.productoId,
                sucursalId: cdId,
                existencia: -pendientePorDescontar,
              },
            });
          }

          // Registrar detalle consumido sin lote
          await tx.ordenProduccionDetalle.create({
            data: {
              ordenProduccionId: op.id,
              productoId: reqDetalle.productoId,
              cantidadConsumida: pendientePorDescontar,
            },
          });

          // Registrar movimiento general
          await tx.movimientoInventario.create({
            data: {
              tipo: 'SALIDA',
              productoId: reqDetalle.productoId,
              sucursalOrigenId: cdId,
              cantidad: pendientePorDescontar,
              motivo: `Picking de materia prima (Déficit/Shortage) en Orden ${op.numeroOrden}`,
              usuarioId: req.user.id,
            },
          });
        }
      }

      const nuevoEstado = tieneShortage ? 'FALTANTES' : 'PLANIFICADA';
      const pickingCompletado = !tieneShortage;

      const opUpdated = await tx.ordenProduccion.update({
        where: { id: op.id },
        data: {
          estado: nuevoEstado,
          pickingCompletado,
        },
      });

      return { opUpdated, tieneShortage };
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CONFIRMAR_PICKING',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(result),
      },
    });

    return result;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('ordenes/:id')
  async editarOrden(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { cantidadPlanificada, responsableId } = body;

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            detalles: true,
          },
        },
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }
    const cdId = cd.id;

    if (op.estado !== 'PLANIFICADA' && op.estado !== 'FALTANTES') {
      throw new BadRequestException(
        'Solo se pueden editar órdenes en estado PLANIFICADA o FALTANTES.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nuevaCantidad = cantidadPlanificada != null ? parseFloat(cantidadPlanificada) : op.cantidadPlanificada;

      // 1. Revertir cualquier picking previo si cambia la cantidad planificada
      if (nuevaCantidad !== op.cantidadPlanificada) {
        const detallesPrevios = await tx.ordenProduccionDetalle.findMany({
          where: { ordenProduccionId: op.id },
        });

        for (const det of detallesPrevios) {
          if (det.loteId) {
            await tx.lote.update({
              where: { id: det.loteId },
              data: { cantidadActual: { increment: det.cantidadConsumida } },
            });
          }

          const invGen = await tx.inventario.findUnique({
            where: { productoId_sucursalId: { productoId: det.productoId, sucursalId: cdId } },
          });
          if (invGen) {
            await tx.inventario.update({
              where: { id: invGen.id },
              data: { existencia: { increment: det.cantidadConsumida } },
            });
          }

          await tx.movimientoInventario.create({
            data: {
              tipo: 'ENTRADA',
              productoId: det.productoId,
              loteId: det.loteId,
              sucursalDestinoId: cdId,
              cantidad: det.cantidadConsumida,
              motivo: `Reversión de picking por cambio de cantidad requerida en Orden ${op.numeroOrden}`,
              usuarioId: req.user.id,
            },
          });
        }

        await tx.ordenProduccionDetalle.deleteMany({
          where: { ordenProduccionId: op.id },
        });
      }

      // 2. Verificar si con la nueva cantidad hay shortages en el inventario actual
      let tieneShortage = false;
      for (const reqDetalle of op.receta.detalles) {
        const totalRequerido = reqDetalle.cantidadRequerida * nuevaCantidad;

        const inv = await tx.inventario.findUnique({
          where: {
            productoId_sucursalId: {
              productoId: reqDetalle.productoId,
              sucursalId: cdId,
            },
          },
        });
        const stockDisponible = inv ? inv.existencia : 0;
        if (stockDisponible < totalRequerido) {
          tieneShortage = true;
        }
      }

      const nuevoEstado = tieneShortage ? 'FALTANTES' : 'PLANIFICADA';

      const opUpdated = await tx.ordenProduccion.update({
        where: { id },
        data: {
          cantidadPlanificada: nuevaCantidad,
          responsableId: responsableId || op.responsableId,
          estado: nuevoEstado,
          pickingCompletado: nuevaCantidad !== op.cantidadPlanificada ? false : op.pickingCompletado,
        },
      });

      return opUpdated;
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'EDITAR_ORDEN_PRODUCCION',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify(updated),
      },
    });

    return updated;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('limpiar-datos-pruebas')
  async limpiarDatosPruebas(@Request() req: any) {
    const res = await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar Compras (Pagos, Facturas Detalle, Facturas, Recepciones Detalle, Recepciones, Ordenes de Compra Detalle, Ordenes de Compra)
      await tx.pagoCompra.deleteMany({});
      await tx.facturaCompraDetalle.deleteMany({});
      await tx.facturaCompra.deleteMany({});
      await tx.recepcionCompraDetalle.deleteMany({});
      await tx.recepcionCompra.deleteMany({});
      await tx.ordenCompraDetalle.deleteMany({});
      await tx.ordenCompra.deleteMany({});

      // 2. Eliminar Ventas (Detalles de Ventas, Ventas, Controles de Cajas)
      await tx.ventaDetalle.deleteMany({});
      await tx.venta.deleteMany({});
      await tx.cajaControl.deleteMany({});

      // 3. Eliminar Transferencias (Detalles de Transferencias, Transferencias)
      await tx.transferenciaDetalle.deleteMany({});
      await tx.transferencia.deleteMany({});

      // 4. Eliminar Producción y Mermas (Detalles de OP, Mermas)
      await tx.ordenProduccionDetalle.deleteMany({});
      await tx.merma.deleteMany({});

      // 5. Eliminar Calidad, Lecturas y Alertas (ControlLeche, ControlCalidad, NoConformidades, FreezerLectura, Alertas)
      await tx.controlLeche.deleteMany({});
      await tx.controlCalidad.deleteMany({});
      await tx.noConformidad.deleteMany({});
      await tx.freezerLectura.deleteMany({});
      await tx.alerta.deleteMany({});

      // 6. Eliminar Movimientos de Inventario (debido a la relación de Lote)
      await tx.movimientoInventario.deleteMany({});

      // 7. Eliminar Lotes (después de eliminar todo lo que le hace referencia)
      await tx.lote.deleteMany({});

      // 8. Eliminar Órdenes de Producción
      await tx.ordenProduccion.deleteMany({});

      // 9. Resetear existencia y comprometido a 0 en Inventario para TODOS los productos en TODAS las sucursales
      await tx.inventario.updateMany({
        data: {
          existencia: 0,
          comprometido: 0,
        },
      });

      return { success: true };
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'LIMPIAR_DATOS_PRUEBAS_COMPLETO',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ success: true }),
      },
    });

    return res;
  }
}
