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
          include: { producto: true }
        }
      },
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('recetas')
  async crearReceta(@Request() req: any, @Body() body: any) {
    const { nombre, descripcion, productoFinalId, cantidadEsperada, costoEstimado, detalles } = body;

    if (!nombre || !productoFinalId || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      throw new BadRequestException('El nombre, el producto final y al menos un ingrediente/insumo son obligatorios.');
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
        }
      });

      for (const item of detalles) {
        await tx.recetaDetalle.create({
          data: {
            recetaId: r.id,
            productoId: item.productoId,
            cantidadRequerida: parseFloat(item.cantidadRequerida),
          }
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
  async actualizarReceta(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { nombre, descripcion, productoFinalId, cantidadEsperada, costoEstimado, detalles } = body;

    const receta = await this.prisma.$transaction(async (tx) => {
      const r = await tx.receta.update({
        where: { id },
        data: {
          nombre,
          descripcion,
          productoFinalId,
          cantidadEsperada: cantidadEsperada != null ? parseFloat(cantidadEsperada) : undefined,
          costoEstimado: costoEstimado != null ? parseFloat(costoEstimado) : undefined,
        }
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
            }
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
    const check = await this.prisma.ordenProduccion.count({ where: { recetaId: id } });
    if (check > 0) {
      throw new BadRequestException('No se puede eliminar la receta porque posee órdenes de producción asociadas.');
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
          include: { productoFinal: true }
        },
        sucursal: true,
        creadoPor: true,
        responsable: true,
        detalles: {
          include: { producto: true }
        },
        mermas: {
          include: { producto: true }
        },
        inspecciones: true,
        lotesProducidos: true
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ordenes')
  async crearOrdenProduccion(@Request() req: any, @Body() body: any) {
    const { recetaId, sucursalId, cantidadPlanificada, responsableId } = body;

    if (!recetaId || !sucursalId || !cantidadPlanificada || !responsableId) {
      throw new BadRequestException('Todos los campos de la orden (receta, sucursal, cantidad planificada y responsable) son obligatorios.');
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
      }
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
      include: { receta: { include: { detalles: true } } }
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }
    if (op.estado !== 'PLANIFICADA') {
      throw new BadRequestException('Solo se pueden iniciar órdenes en estado PLANIFICADA.');
    }

    const updated = await this.prisma.ordenProduccion.update({
      where: { id },
      data: {
        estado: 'EN_PROCESO',
        fechaInicio: new Date(),
      }
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
  async completarOrden(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { cantidadProducida, loteNumero, mermas } = body;

    if (cantidadProducida == null || !loteNumero) {
      throw new BadRequestException('La cantidad producida y el número de lote son obligatorios.');
    }

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            productoFinal: true,
            detalles: true,
          }
        }
      }
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }
    if (op.estado !== 'EN_PROCESO') {
      throw new BadRequestException('Solo se pueden completar órdenes en estado EN_PROCESO.');
    }

    // Verificar si ya existe lote con ese número
    const existLote = await this.prisma.lote.findUnique({ where: { numeroLote: loteNumero } });
    if (existLote) {
      throw new BadRequestException(`El número de lote "${loteNumero}" ya existe en el sistema.`);
    }

    // Buscar proveedor interno o primer proveedor para asociar al lote producido
    let proveedor = await this.prisma.proveedor.findFirst({ where: { codigo: 'INTERNO' } });
    if (!proveedor) {
      proveedor = await this.prisma.proveedor.findFirst();
      if (!proveedor) {
        throw new BadRequestException('Debe registrar al menos un proveedor en el sistema antes de generar lotes de producción.');
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cantProd = parseFloat(cantidadProducida);
      const cantPlan = op.cantidadPlanificada;
      const rendimientoReal = cantPlan > 0 ? (cantProd / cantPlan) * 100 : 100;
      const variacion = cantProd - cantPlan;

      // 1. Descontar materias primas mediante FEFO
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

          const aDescontar = Math.min(lote.cantidadActual, pendientePorDescontar);

          // Descontar del lote
          await tx.lote.update({
            where: { id: lote.id },
            data: { cantidadActual: { decrement: aDescontar } }
          });

          // Registrar detalle consumido
          await tx.ordenProduccionDetalle.create({
            data: {
              ordenProduccionId: op.id,
              productoId: reqDetalle.productoId,
              loteId: lote.id,
              cantidadConsumida: aDescontar,
            }
          });

          // Registrar Movimiento de inventario
          await tx.movimientoInventario.create({
            data: {
              tipo: 'SALIDA',
              productoId: reqDetalle.productoId,
              loteId: lote.id,
              sucursalOrigenId: op.sucursalId,
              cantidad: aDescontar,
              motivo: `Consumo materia prima en Orden de Producción ${op.numeroOrden}`,
              usuarioId: req.user.id,
            }
          });

          pendientePorDescontar -= aDescontar;
        }

        // Si faltó stock y no se cubrió todo, descontar del inventario general (permitiendo negativos o lanzando error)
        // Para este ERP robusto, descontamos el total del Inventario de la sucursal
        const inv = await tx.inventario.findUnique({
          where: { productoId_sucursalId: { productoId: reqDetalle.productoId, sucursalId: op.sucursalId } }
        });

        if (inv) {
          await tx.inventario.update({
            where: { id: inv.id },
            data: { existencia: { decrement: totalRequerido } }
          });
        } else {
          await tx.inventario.create({
            data: {
              productoId: reqDetalle.productoId,
              sucursalId: op.sucursalId,
              existencia: -totalRequerido,
            }
          });
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
            }
          });
          
          // Descontar inventario de la merma de materia prima si no se descontó en FEFO
          const invM = await tx.inventario.findUnique({
            where: { productoId_sucursalId: { productoId: m.productoId, sucursalId: op.sucursalId } }
          });
          if (invM) {
            await tx.inventario.update({
              where: { id: invM.id },
              data: { existencia: { decrement: parseFloat(m.cantidad) } }
            });
          }
        }
      }

      // 3. Crear Lote para el producto terminado producido
      const vidaUtil = op.receta.productoFinal.vidaUtilDias || 30;
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + vidaUtil);

      const nuevoLote = await tx.lote.create({
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
          estado: 'APROBADO', // Se aprueba inicialmente, o cuarentena si Calidad lo requiere
          ordenProduccionId: op.id,
        }
      });

      // 4. Incrementar inventario del producto terminado
      const invFinal = await tx.inventario.findUnique({
        where: { productoId_sucursalId: { productoId: op.receta.productoFinalId, sucursalId: op.sucursalId } }
      });

      if (invFinal) {
        await tx.inventario.update({
          where: { id: invFinal.id },
          data: { existencia: { increment: cantProd } }
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId: op.receta.productoFinalId,
            sucursalId: op.sucursalId,
            existencia: cantProd,
          }
        });
      }

      // Registrar movimiento de inventario de entrada
      await tx.movimientoInventario.create({
        data: {
          tipo: 'ENTRADA',
          productoId: op.receta.productoFinalId,
          loteId: nuevoLote.id,
          sucursalDestinoId: op.sucursalId,
          cantidad: cantProd,
          motivo: `Ingreso por Producción finalizada Orden ${op.numeroOrden}`,
          usuarioId: req.user.id,
        }
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
        }
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
      throw new BadRequestException('No se puede cancelar una orden ya completada o cancelada.');
    }

    const updated = await this.prisma.ordenProduccion.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        fechaFin: new Date(),
      }
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
      throw new BadRequestException('El producto, la cantidad, el motivo y la sucursal son obligatorios.');
    }

    const merma = await this.prisma.$transaction(async (tx) => {
      const m = await tx.merma.create({
        data: {
          productoId,
          cantidad: parseFloat(cantidad),
          motivo,
          responsableId: req.user.id,
        }
      });

      // Descontar inventario general de la sucursal
      const inv = await tx.inventario.findUnique({
        where: { productoId_sucursalId: { productoId, sucursalId } }
      });

      if (inv) {
        await tx.inventario.update({
          where: { id: inv.id },
          data: { existencia: { decrement: parseFloat(cantidad) } }
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId,
            sucursalId,
            existencia: -parseFloat(cantidad),
          }
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
        }
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
}
