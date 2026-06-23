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
          include: {
            producto: true,
            sustitutos: {
              include: { producto: true },
            },
          },
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

    const prod = await this.prisma.producto.findUnique({
      where: { id: productoFinalId },
    });
    if (!prod) {
      throw new BadRequestException('El producto final no existe.');
    }
    if (!prod.esManufacturado) {
      throw new BadRequestException('El producto final seleccionado no está marcado como manufacturado.');
    }

    if (prod.unidadMedida.toUpperCase() === 'UNIDAD') {
      const qtyExpectedNum = parseFloat(cantidadEsperada || 1);
      if (qtyExpectedNum % 1 !== 0) {
        throw new BadRequestException(
          'Para productos en Unidades, el rendimiento esperado debe ser un número entero.',
        );
      }
    }

    for (const item of detalles) {
      const ingProd = await this.prisma.producto.findUnique({
        where: { id: item.productoId },
      });
      if (ingProd && ingProd.unidadMedida.toUpperCase() === 'UNIDAD') {
        const qtyReqNum = parseFloat(item.cantidadRequerida);
        if (qtyReqNum % 1 !== 0) {
          throw new BadRequestException(
            `Para el ingrediente "${ingProd.descripcion}" (Unidades), la cantidad requerida debe ser un número entero.`,
          );
        }
      }
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
        const rd = await tx.recetaDetalle.create({
          data: {
            recetaId: r.id,
            productoId: item.productoId,
            cantidadRequerida: parseFloat(item.cantidadRequerida),
          },
        });

        if (item.sustitutoIds && Array.isArray(item.sustitutoIds)) {
          for (const sustId of item.sustitutoIds) {
            await tx.recetaDetalleSustituto.create({
              data: {
                recetaDetalleId: rd.id,
                productoId: sustId,
              },
            });
          }
        }
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

    if (productoFinalId) {
      const prod = await this.prisma.producto.findUnique({
        where: { id: productoFinalId },
      });
      if (!prod) {
        throw new BadRequestException('El producto final no existe.');
      }
      if (!prod.esManufacturado) {
        throw new BadRequestException('El producto final seleccionado no está marcado como manufacturado.');
      }
    }

    if (productoFinalId || cantidadEsperada != null) {
      const targetProdId = productoFinalId || (await this.prisma.receta.findUnique({ where: { id } }))?.productoFinalId;
      if (targetProdId) {
        const prod = await this.prisma.producto.findUnique({ where: { id: targetProdId } });
        if (prod && prod.unidadMedida.toUpperCase() === 'UNIDAD') {
          const qtyExpected = cantidadEsperada != null ? parseFloat(cantidadEsperada) : (await this.prisma.receta.findUnique({ where: { id } }))?.cantidadEsperada;
          if (qtyExpected != null && qtyExpected % 1 !== 0) {
            throw new BadRequestException(
              'Para productos en Unidades, el rendimiento esperado debe ser un número entero.',
            );
          }
        }
      }
    }

    if (detalles && Array.isArray(detalles)) {
      for (const item of detalles) {
        const ingProd = await this.prisma.producto.findUnique({
          where: { id: item.productoId },
        });
        if (ingProd && ingProd.unidadMedida.toUpperCase() === 'UNIDAD') {
          const qtyReqNum = parseFloat(item.cantidadRequerida);
          if (qtyReqNum % 1 !== 0) {
            throw new BadRequestException(
              `Para el ingrediente "${ingProd.descripcion}" (Unidades), la cantidad requerida debe ser un número entero.`,
            );
          }
        }
      }
    }

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
          const rd = await tx.recetaDetalle.create({
            data: {
              recetaId: id,
              productoId: item.productoId,
              cantidadRequerida: parseFloat(item.cantidadRequerida),
            },
          });

          if (item.sustitutoIds && Array.isArray(item.sustitutoIds)) {
            for (const sustId of item.sustitutoIds) {
              await tx.recetaDetalleSustituto.create({
                data: {
                  recetaDetalleId: rd.id,
                  productoId: sustId,
                },
              });
            }
          }
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

    const receta = await this.prisma.receta.findUnique({
      where: { id: recetaId },
      include: { productoFinal: true },
    });
    if (!receta) {
      throw new BadRequestException('La receta especificada no existe.');
    }

    if (receta.productoFinal && receta.productoFinal.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (parseFloat(cantidadPlanificada) % 1 !== 0) {
        throw new BadRequestException(
          'Para productos en Unidades, la cantidad planificada debe ser un número entero.',
        );
      }
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

    // Inicializar operaciones inmediatamente
    await this.inicializarOperaciones(op.id, receta.productoFinalId);

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

    // Inicializar operaciones
    await this.inicializarOperaciones(id, op.receta.productoFinalId);

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

    if (op.receta.productoFinal && op.receta.productoFinal.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (parseFloat(cantidadProducida) % 1 !== 0) {
        throw new BadRequestException(
          'Para productos en Unidades, la cantidad real producida debe ser un número entero.',
        );
      }
    }

    if (mermas && Array.isArray(mermas)) {
      for (const m of mermas) {
        const mProd = await this.prisma.producto.findUnique({
          where: { id: m.productoId },
        });
        if (mProd && mProd.unidadMedida.toUpperCase() === 'UNIDAD' && parseFloat(m.cantidad) % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto merma "${mProd.descripcion}" (Unidades), la cantidad debe ser un número entero.`,
          );
        }
      }
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
          const totalRequerido = reqDetalle.cantidadRequerida * cantPlan;

          // Calcular cuánto ya se consumió/pickeó para este producto con lote asignado
          const consumidoPrevio = await tx.ordenProduccionDetalle.aggregate({
            where: {
              ordenProduccionId: op.id,
              productoId: reqDetalle.productoId,
              loteId: { not: null },
            },
            _sum: {
              cantidadConsumida: true,
            },
          });
          const yaConsumido = consumidoPrevio._sum.cantidadConsumida || 0;

          let pendientePorDescontar = Math.max(0, totalRequerido - yaConsumido);
          if (pendientePorDescontar <= 0) continue;

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

            // Decrementar del inventario general
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
                data: { existencia: { decrement: aDescontar } },
              });
            } else {
              await tx.inventario.create({
                data: {
                  productoId: reqDetalle.productoId,
                  sucursalId: cdId,
                  existencia: -aDescontar,
                },
              });
            }

            pendientePorDescontar -= aDescontar;
          }

          // Si aún falta stock (shortage), descontar la diferencia restante de inventario general
          if (pendientePorDescontar > 0) {
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

            // Registrar detalle consumido sin lote para el déficit restante
            await tx.ordenProduccionDetalle.create({
              data: {
                ordenProduccionId: op.id,
                productoId: reqDetalle.productoId,
                cantidadConsumida: pendientePorDescontar,
              },
            });

            // Registrar Movimiento de inventario sin lote
            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: reqDetalle.productoId,
                sucursalOrigenId: cdId,
                cantidad: pendientePorDescontar,
                motivo: `Consumo materia prima (Déficit) en Orden de Producción ${op.numeroOrden}`,
                usuarioId: req.user.id,
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

    const cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001' },
    });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }
    const cdId = cd.id;

    const updated = await this.prisma.$transaction(async (tx) => {
      const detalles = await tx.ordenProduccionDetalle.findMany({
        where: { ordenProduccionId: op.id },
      });

      for (const det of detalles) {
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
            motivo: `Retorno de materia prima por cancelación de Orden ${op.numeroOrden}`,
            usuarioId: req.user.id,
          },
        });
      }

      return tx.ordenProduccion.update({
        where: { id: op.id },
        data: {
          estado: 'CANCELADA',
          fechaFin: new Date(),
        },
      });
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

    const prodDb = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (prodDb && prodDb.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (parseFloat(cantidad) % 1 !== 0) {
        throw new BadRequestException(
          'Para productos en Unidades, la cantidad de merma debe ser un número entero.',
        );
      }
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

    // 3.5. Obtener total de órdenes de producción abiertas en el CD (PLANIFICADA, EN_PROCESO o FALTANTES) para descontar de las sugerencias
    const openCDOrders = await this.prisma.ordenProduccion.findMany({
      where: {
        sucursalId: plantaPrincipal.id,
        estado: { in: ['PLANIFICADA', 'EN_PROCESO', 'FALTANTES'] },
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
            estado: { in: ['PLANIFICADA', 'EN_PROCESO', 'FALTANTES'] },
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
                sustitutos: {
                  include: { producto: true },
                },
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

      // Obtener stock y lotes para cada sustituto
      const sustitutosInfo: any[] = [];
      for (const sust of reqDetalle.sustitutos) {
        const invSust = await this.prisma.inventario.findUnique({
          where: {
            productoId_sucursalId: {
              productoId: sust.productoId,
              sucursalId: cdId,
            },
          },
        });
        const stockSust = invSust ? invSust.existencia : 0;

        const lotesSust = await this.prisma.lote.findMany({
          where: {
            productoId: sust.productoId,
            cantidadActual: { gt: 0 },
            estado: 'APROBADO',
          },
          orderBy: { fechaVencimiento: 'asc' },
        });

        sustitutosInfo.push({
          productoId: sust.productoId,
          sku: sust.producto.sku,
          descripcion: sust.producto.descripcion,
          unidadMedida: sust.producto.unidadMedida || 'U',
          stockDisponible: parseFloat(stockSust.toFixed(2)),
          lotesDisponibles: lotesSust.map((l) => ({
            id: l.id,
            numeroLote: l.numeroLote,
            cantidadActual: l.cantidadActual,
          })),
        });
      }

      // Filtrar detalles que correspondan a picking físico real (con lote asignado)
      // Tanto del producto requerido como de sus sustitutos
      const substituteIds = reqDetalle.sustitutos.map((s) => s.productoId);
      const allowedProductIds = [reqDetalle.productoId, ...substituteIds];

      const consumidoRecords = op.detalles.filter(
        (d) => allowedProductIds.includes(d.productoId) && d.loteId !== null,
      );
      const yaEntregado = consumidoRecords.reduce((sum, r) => sum + r.cantidadConsumida, 0);
      const cantidadPicked = Math.max(0, cantidadRequerida - yaEntregado);

      // loteNumero se inicializa vacío en cada nueva transacción picking
      const loteNumero = '';

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
        yaEntregado: parseFloat(yaEntregado.toFixed(2)),
        cantidadPicked: parseFloat(cantidadPicked.toFixed(2)),
        picked: op.pickingCompletado,
        loteNumero,
        lotesDisponibles: lotes.map((l) => ({
          id: l.id,
          numeroLote: l.numeroLote,
          cantidadActual: l.cantidadActual,
        })),
        sustitutos: sustitutosInfo,
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
              include: {
                producto: true,
                sustitutos: {
                  include: { producto: true },
                },
              },
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
      // 1. Procesar el picking actual de manera incremental
      for (const reqDetalle of op.receta.detalles) {
        // Encontrar por reqProductoId (nuevo formato) o productoId (antiguo formato)
        const itemPicking = detalles.find(
          (d: any) => (d.reqProductoId || d.productoId) === reqDetalle.productoId,
        );
        if (!itemPicking || !itemPicking.picked) {
          continue;
        }

        const cantidadAPreparar = parseFloat(itemPicking.cantidadPicked || 0);
        if (cantidadAPreparar <= 0) {
          continue;
        }

        const actualProductoId = itemPicking.productoId || reqDetalle.productoId;

        // Validar que el producto sea el original o un sustituto aprobado
        const substituteIds = reqDetalle.sustitutos.map((s) => s.productoId);
        if (actualProductoId !== reqDetalle.productoId && !substituteIds.includes(actualProductoId)) {
          throw new BadRequestException(
            `El producto seleccionado no es un sustituto válido para "${reqDetalle.producto.descripcion}".`,
          );
        }

        let actualProducto = reqDetalle.producto;
        if (actualProductoId !== reqDetalle.productoId) {
          const sustObj = reqDetalle.sustitutos.find((s) => s.productoId === actualProductoId);
          if (sustObj) {
            actualProducto = sustObj.producto;
          } else {
            actualProducto = (await tx.producto.findUnique({ where: { id: actualProductoId } })) || reqDetalle.producto;
          }
        }

        if (actualProducto && actualProducto.unidadMedida.toUpperCase() === 'UNIDAD') {
          if (cantidadAPreparar % 1 !== 0) {
            throw new BadRequestException(
              `Para el ingrediente "${actualProducto.descripcion}" (Unidades), la cantidad de picking debe ser un número entero.`,
            );
          }
        }

        let pendientePorDescontar = cantidadAPreparar;

        // A: Si se escaneó/seleccionó un lote específico, descontar primero de ese lote
        if (itemPicking.loteNumero) {
          const lote = await tx.lote.findFirst({
            where: {
              numeroLote: itemPicking.loteNumero,
              productoId: actualProductoId,
            },
          });

          if (!lote) {
            throw new BadRequestException(
              `El lote escaneado "${itemPicking.loteNumero}" no existe o no corresponde al ingrediente "${actualProducto.descripcion}".`,
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

            // Decrementar del inventario general
            const inv = await tx.inventario.findUnique({
              where: {
                productoId_sucursalId: {
                  productoId: actualProductoId,
                  sucursalId: cdId,
                },
              },
            });
            if (inv) {
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDescontar } },
              });
            } else {
              await tx.inventario.create({
                data: {
                  productoId: actualProductoId,
                  sucursalId: cdId,
                  existencia: -aDescontar,
                },
              });
            }

            await tx.ordenProduccionDetalle.create({
              data: {
                ordenProduccionId: op.id,
                productoId: actualProductoId,
                loteId: lote.id,
                cantidadConsumida: aDescontar,
              },
            });

            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: actualProductoId,
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
        if (pendientePorDescontar > 0) {
          const lotesDisponibles = await tx.lote.findMany({
            where: {
              productoId: actualProductoId,
              cantidadActual: { gt: 0 },
              estado: 'APROBADO',
              NOT: itemPicking.loteNumero ? { numeroLote: itemPicking.loteNumero } : undefined,
            },
            orderBy: { fechaVencimiento: 'asc' },
          });

          for (const lote of lotesDisponibles) {
            if (pendientePorDescontar <= 0) break;

            const aDescontar = Math.min(lote.cantidadActual, pendientePorDescontar);

            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: { decrement: aDescontar } },
            });

            const inv = await tx.inventario.findUnique({
              where: {
                productoId_sucursalId: {
                  productoId: actualProductoId,
                  sucursalId: cdId,
                },
              },
            });
            if (inv) {
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDescontar } },
              });
            } else {
              await tx.inventario.create({
                data: {
                  productoId: actualProductoId,
                  sucursalId: cdId,
                  existencia: -aDescontar,
                },
              });
            }

            await tx.ordenProduccionDetalle.create({
              data: {
                ordenProduccionId: op.id,
                productoId: actualProductoId,
                loteId: lote.id,
                cantidadConsumida: aDescontar,
              },
            });

            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: actualProductoId,
                loteId: lote.id,
                sucursalOrigenId: cdId,
                cantidad: aDescontar,
                motivo: `Picking de materia prima en Orden de Producción ${op.numeroOrden}`,
                usuarioId: req.user.id,
              },
            });

            pendientePorDescontar -= aDescontar;
          }
        }
      }

      // 2. Determinar si aún hay shortage para la orden sumando todos los detalles recolectados con lote asignado (original + sustitutos)
      let tieneShortage = false;
      for (const reqDetalle of op.receta.detalles) {
        const cantidadRequerida = reqDetalle.cantidadRequerida * op.cantidadPlanificada;

        const substituteIds = reqDetalle.sustitutos.map((s) => s.productoId);
        const allowedProductIds = [reqDetalle.productoId, ...substituteIds];

        const aggregate = await tx.ordenProduccionDetalle.aggregate({
          where: {
            ordenProduccionId: op.id,
            productoId: { in: allowedProductIds },
            loteId: { not: null },
          },
          _sum: {
            cantidadConsumida: true,
          },
        });
        const totalPicked = aggregate._sum.cantidadConsumida || 0;

        if (totalPicked < cantidadRequerida) {
          tieneShortage = true;
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
            productoFinal: true,
          },
        },
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    if (cantidadPlanificada != null && op.receta.productoFinal && op.receta.productoFinal.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (parseFloat(cantidadPlanificada) % 1 !== 0) {
        throw new BadRequestException(
          'Para productos en Unidades, la cantidad planificada debe ser un número entero.',
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

  // --- RUTA DE OPERACIONES (BILL OF OPERATIONS) ---
  @Get('operaciones/activas')
  async listarOperacionesActivas() {
    return this.prisma.ordenProduccion.findMany({
      where: {
        estado: { in: ['PLANIFICADA', 'EN_PROCESO'] },
      },
      include: {
        receta: {
          include: { productoFinal: true },
        },
        operaciones: true,
        responsable: true,
        sucursal: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('operaciones/:opId/:workCenter/comenzar')
  async comenzarOperacion(
    @Param('opId') opId: string,
    @Param('workCenter') workCenter: string,
    @Request() req: any,
  ) {
    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id: opId },
      include: { operaciones: true, receta: true },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    if (workCenter === 'WC-PAST' && !op.pickingCompletado) {
      throw new BadRequestException(
        'No se puede iniciar la pasteurización (WC-PAST) si el picking de materia prima no está completado.',
      );
    }

    // Inicializar operaciones si no existen
    if (op.operaciones.length === 0) {
      await this.inicializarOperaciones(opId, op.receta.productoFinalId);
    }

    // Si la orden está en PLANIFICADA y el workCenter es WC-PAST, iniciar la orden general
    if (op.estado === 'PLANIFICADA' && workCenter === 'WC-PAST') {
      await this.prisma.ordenProduccion.update({
        where: { id: opId },
        data: {
          estado: 'EN_PROCESO',
          fechaInicio: new Date(),
        },
      });
    }

    // Actualizar la operación específica a EN_PROCESO
    const updatedOperacion = await this.prisma.ordenProduccionOperacion.update({
      where: {
        ordenProduccionId_workCenter: {
          ordenProduccionId: opId,
          workCenter,
        },
      },
      data: {
        estado: 'EN_PROCESO',
        fechaInicio: new Date(),
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `COMENZAR_OPERACION_${workCenter}`,
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ opId, workCenter }),
      },
    });

    return updatedOperacion;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('operaciones/:opId/:workCenter/finalizar')
  async finalizarOperacion(
    @Param('opId') opId: string,
    @Param('workCenter') workCenter: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { datosJson, cantidadProducida, loteNumero, mermas, notas } = body;

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id: opId },
      include: {
        operaciones: true,
        receta: {
          include: {
            productoFinal: true,
            detalles: {
              include: {
                producto: true,
                sustitutos: {
                  include: { producto: true },
                },
              },
            },
          },
        },
      },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    const operacion = op.operaciones.find((o) => o.workCenter === workCenter);
    if (!operacion) {
      throw new BadRequestException('La operación especificada no existe en esta orden.');
    }

    if (operacion.estado !== 'EN_PROCESO') {
      throw new BadRequestException('Solo se pueden finalizar operaciones que estén EN_PROCESO.');
    }

    const fechaFin = new Date();
    const fechaInicio = operacion.fechaInicio || new Date();
    const duracionSegundos = Math.round((fechaFin.getTime() - fechaInicio.getTime()) / 1000);

    const updatedOperacion = await this.prisma.ordenProduccionOperacion.update({
      where: {
        ordenProduccionId_workCenter: {
          ordenProduccionId: opId,
          workCenter,
        },
      },
      data: {
        estado: 'COMPLETADA',
        fechaFin,
        duracionSegundos,
        datosJson: datosJson ? JSON.stringify(datosJson) : null,
        notas: notas || null,
      },
    });

    // Si es el último paso (Cámara Fría), completar toda la orden de producción
    if (workCenter === 'WC-CFRI') {
      if (cantidadProducida == null || !loteNumero) {
        throw new BadRequestException('Para finalizar el último paso, la cantidad real y el lote son obligatorios.');
      }

      if (op.receta.productoFinal && op.receta.productoFinal.unidadMedida.toUpperCase() === 'UNIDAD') {
        if (parseFloat(cantidadProducida) % 1 !== 0) {
          throw new BadRequestException(
            'Para productos en Unidades, la cantidad real producida debe ser un número entero.',
          );
        }
      }

      if (mermas && Array.isArray(mermas)) {
        for (const m of mermas) {
          const mProd = await this.prisma.producto.findUnique({
            where: { id: m.productoId },
          });
          if (mProd && mProd.unidadMedida.toUpperCase() === 'UNIDAD' && parseFloat(m.cantidad) % 1 !== 0) {
            throw new BadRequestException(
              `Para el producto merma "${mProd.descripcion}" (Unidades), la cantidad debe ser un número entero.`,
            );
          }
        }
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

      await this.prisma.$transaction(async (tx) => {
        const cantProd = parseFloat(cantidadProducida);
        const cantPlan = op.cantidadPlanificada;
        const rendimientoReal = cantPlan > 0 ? (cantProd / cantPlan) * 100 : 100;
        const variacion = cantProd - cantPlan;

        // Descontar materias primas mediante FEFO (si no se completó en picking)
        if (!op.pickingCompletado) {
          for (const reqDetalle of op.receta.detalles) {
            const totalRequerido = reqDetalle.cantidadRequerida * cantPlan;

            const substituteIds = reqDetalle.sustitutos.map((s) => s.productoId);
            const allowedProductIds = [reqDetalle.productoId, ...substituteIds];

            const consumidoPrevio = await tx.ordenProduccionDetalle.aggregate({
              where: {
                ordenProduccionId: op.id,
                productoId: { in: allowedProductIds },
                loteId: { not: null },
              },
              _sum: { cantidadConsumida: true },
            });
            const yaConsumido = consumidoPrevio._sum.cantidadConsumida || 0;

            let pendientePorDescontar = Math.max(0, totalRequerido - yaConsumido);
            if (pendientePorDescontar <= 0) continue;

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
                  motivo: `Consumo materia prima en OP ${op.numeroOrden} desde Ruta Operaciones`,
                  usuarioId: req.user.id,
                },
              });

              const inv = await tx.inventario.findUnique({
                where: { productoId_sucursalId: { productoId: reqDetalle.productoId, sucursalId: cdId } },
              });
              if (inv) {
                await tx.inventario.update({
                  where: { id: inv.id },
                  data: { existencia: { decrement: aDescontar } },
                });
              } else {
                await tx.inventario.create({
                  data: { productoId: reqDetalle.productoId, sucursalId: cdId, existencia: -aDescontar },
                });
              }

              pendientePorDescontar -= aDescontar;
            }

            if (pendientePorDescontar > 0) {
              const inv = await tx.inventario.findUnique({
                where: { productoId_sucursalId: { productoId: reqDetalle.productoId, sucursalId: cdId } },
              });
              if (inv) {
                await tx.inventario.update({
                  where: { id: inv.id },
                  data: { existencia: { decrement: pendientePorDescontar } },
                });
              } else {
                await tx.inventario.create({
                  data: { productoId: reqDetalle.productoId, sucursalId: cdId, existencia: -pendientePorDescontar },
                });
              }

              await tx.ordenProduccionDetalle.create({
                data: {
                  ordenProduccionId: op.id,
                  productoId: reqDetalle.productoId,
                  cantidadConsumida: pendientePorDescontar,
                },
              });

              await tx.movimientoInventario.create({
                data: {
                  tipo: 'SALIDA',
                  productoId: reqDetalle.productoId,
                  sucursalOrigenId: cdId,
                  cantidad: pendientePorDescontar,
                  motivo: `Consumo materia prima (Déficit) en OP ${op.numeroOrden} desde Ruta Operaciones`,
                  usuarioId: req.user.id,
                },
              });
            }
          }
        }

        // Registrar mermas si las hay
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

            const invM = await tx.inventario.findUnique({
              where: { productoId_sucursalId: { productoId: m.productoId, sucursalId: cdId } },
            });
            if (invM) {
              await tx.inventario.update({
                where: { id: invM.id },
                data: { existencia: { decrement: parseFloat(m.cantidad) } },
              });
            }
          }
        }

        // Crear/Actualizar Lote para el producto terminado
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

        // Incrementar inventario del producto terminado
        const invFinal = await tx.inventario.findUnique({
          where: { productoId_sucursalId: { productoId: op.receta.productoFinalId, sucursalId: cdId } },
        });

        if (invFinal) {
          await tx.inventario.update({
            where: { id: invFinal.id },
            data: { existencia: { increment: cantProd } },
          });
        } else {
          await tx.inventario.create({
            data: { productoId: op.receta.productoFinalId, sucursalId: cdId, existencia: cantProd },
          });
        }

        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: op.receta.productoFinalId,
            loteId: nuevoLote.id,
            sucursalDestinoId: cdId,
            cantidad: cantProd,
            motivo: `Ingreso por Producción finalizada Orden ${op.numeroOrden} desde Ruta Operaciones`,
            usuarioId: req.user.id,
          },
        });

        // Actualizar estado de la Orden de Producción
        await tx.ordenProduccion.update({
          where: { id: op.id },
          data: {
            estado: 'COMPLETADA',
            cantidadProducida: cantProd,
            rendimientoReal,
            variacion,
            fechaFin: new Date(),
          },
        });
      });
    }

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `FINALIZAR_OPERACION_${workCenter}`,
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ opId, workCenter, duration: duracionSegundos }),
      },
    });

    return updatedOperacion;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put('operaciones/:opId/:workCenter/notas')
  async guardarNotasOperacion(
    @Param('opId') opId: string,
    @Param('workCenter') workCenter: string,
    @Body('notas') notas: string,
  ) {
    const updatedOperacion = await this.prisma.ordenProduccionOperacion.update({
      where: {
        ordenProduccionId_workCenter: {
          ordenProduccionId: opId,
          workCenter,
        },
      },
      data: {
        notas: notas || null,
      },
    });
    return updatedOperacion;
  }

  @Get('bill-of-operations/:productoId')
  async getBillOfOperations(@Param('productoId') productoId: string) {
    const customBoo = await this.prisma.billOfOperations.findMany({
      where: { productoId },
      orderBy: { orden: 'asc' },
    });

    if (customBoo.length > 0) {
      return customBoo;
    }

    // Si no tiene ruta configurada, retornamos los centros de trabajo por defecto
    const defaultWorkCenters = [
      { id: 'WC-PAST', name: 'Pasteurización', desc: 'Pasteurizar y enfriar la leche', duration: 45, fields: [
        { label: 'Temperatura Pasteurización', name: 'temp_pasteurizacion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Pasteurización', name: 'ph_pasteurizacion', type: 'number', required: true },
        { label: 'Temperatura Enfriamiento', name: 'temp_enfriamiento', type: 'number', required: true, suffix: '°C' },
      ]},
      { id: 'WC-CUAJ', name: 'Cuajado', desc: 'Agregar cultivo, cuajo y reposo', duration: 40, fields: [
        { label: 'Lote de Cultivo', name: 'lote_cultivo', type: 'text', required: true },
        { label: 'Dosis de Cultivo', name: 'dosis_cultivo', type: 'number', required: true, suffix: 'g/L' },
        { label: 'Lote de Cuajo', name: 'lote_cuajo', type: 'text', required: true },
        { label: 'Dosis de Cuajo', name: 'dosis_cuajo', type: 'number', required: true, suffix: 'mL/L' },
        { label: 'Temperatura Cuajado', name: 'temp_cuajado', type: 'number', required: true, suffix: '°C' },
        { label: 'Tiempo de Reposo', name: 'tiempo_reposo', type: 'number', required: true, suffix: 'min' },
      ]},
      { id: 'WC-CORTE', name: 'Corte de Cuajada', desc: 'Corte y agitación de la cuajada', duration: 15, fields: [
        { label: 'Tamaño de Grano', name: 'tamano_grano', type: 'text', required: true, suffix: 'mm' },
        { label: 'Tiempo de Agitación', name: 'tiempo_agitacion', type: 'number', required: true, suffix: 'min' },
        { label: 'Velocidad de Agitación', name: 'velocidad_agitacion', type: 'number', required: true, suffix: 'RPM' },
      ]},
      { id: 'WC-COCC', name: 'Cocción', desc: 'Cocción controlada de la mezcla', duration: 30, fields: [
        { label: 'Temperatura Cocción', name: 'temp_coccion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Final Cocción', name: 'ph_coccion', type: 'number', required: true },
      ]},
      { id: 'WC-DESU', name: 'Desuerado', desc: 'Separación del suero de la leche', duration: 20, fields: [
        { label: 'Volumen Suero Obtenido', name: 'volumen_suero', type: 'number', required: true, suffix: 'L' },
        { label: 'pH Suero', name: 'ph_suero', type: 'number', required: true },
      ]},
      { id: 'WC-MOLD', name: 'Moldeado', desc: 'Llenado de moldes con cuajada', duration: 25, fields: [
        { label: 'Cantidad de Moldes Llenados', name: 'cantidad_moldes', type: 'number', required: true, suffix: 'uds' },
        { label: 'Tipo de Molde', name: 'tipo_molde', type: 'text', required: true },
      ]},
      { id: 'WC-PREN', name: 'Prensado', desc: 'Aplicar presión para compactar', duration: 120, fields: [
        { label: 'Presión Aplicada', name: 'presion_applied', type: 'number', required: true, suffix: 'PSI' },
        { label: 'Tiempo de Prensa', name: 'tiempo_prensa', type: 'number', required: true, suffix: 'horas' },
      ]},
      { id: 'WC-SALA', name: 'Salado', desc: 'Inmersión en tina de salmuera', duration: 60, fields: [
        { label: 'Concentración Salmuera', name: 'concentracion_salmuera', type: 'number', required: true, suffix: '% o °Baumé' },
        { label: 'Temperatura Salmuera', name: 'temp_salmuera', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Salmuera', name: 'ph_salmuera', type: 'number', required: true },
      ]},
      { id: 'WC-MADU', name: 'Maduración', desc: 'Control de temperatura y humedad en cámara', duration: 1440, fields: [
        { label: 'Temperatura Cámara', name: 'temp_camara', type: 'number', required: true, suffix: '°C' },
        { label: 'Humedad Relativa', name: 'humedad_relativa', type: 'number', required: true, suffix: '%' },
        { label: 'Tiempo Maduración Planificado', name: 'tiempo_maduracion_dias', type: 'number', required: true, suffix: 'días' },
      ]},
      { id: 'WC-EMPA', name: 'Empaque', desc: 'Empaque, etiquetado y pesaje de quesos', duration: 30, fields: [
        { label: 'Unidades Empacadas', name: 'unidades_empacadas', type: 'number', required: true, suffix: 'uds' },
        { label: 'Lote Bolsa/Empaque', name: 'lote_empaque', type: 'text', required: true },
        { label: 'Peso Neto Total', name: 'peso_neto_total', type: 'number', required: true, suffix: 'kg' },
      ]},
      { id: 'WC-CFRI', name: 'Cámara Fría', desc: 'Almacenamiento y despacho del producto terminado', duration: 60, fields: [
        { label: 'Temperatura Almacenamiento', name: 'temp_almacenamiento', type: 'number', required: true, suffix: '°C' },
        { label: 'Ubicación/Estante en Cámara', name: 'ubicacion_camara', type: 'text', required: true },
        { label: 'Fecha Estimada Despacho', name: 'fecha_despacho_estimada', type: 'date', required: true },
      ]},
    ];

    return defaultWorkCenters.map((wc, idx) => ({
      productoId,
      workCenter: wc.id,
      orden: idx + 1,
      duracionEstimada: wc.duration,
      datosRequeridos: JSON.stringify(wc.fields),
    }));
  }

  @Post('bill-of-operations/:productoId')
  async saveBillOfOperations(
    @Param('productoId') productoId: string,
    @Body() body: { operations: any[] },
    @Request() req: any,
  ) {
    const { operations } = body;

    // Primero limpiamos las existentes
    await this.prisma.billOfOperations.deleteMany({
      where: { productoId },
    });

    // Guardamos la nueva configuración
    const saved: any[] = [];
    for (const op of operations) {
      const created = await this.prisma.billOfOperations.create({
        data: {
          productoId,
          workCenter: op.workCenter,
          orden: parseInt(op.orden),
          duracionEstimada: parseInt(op.duracionEstimada),
          datosRequeridos: typeof op.datosRequeridos === 'string' 
            ? op.datosRequeridos 
            : JSON.stringify(op.datosRequeridos),
        },
      });
      saved.push(created);
    }

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'GUARDAR_BILL_OF_OPERATIONS',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ productoId, count: saved.length }),
      },
    });

    return saved;
  }

  @Delete('bill-of-operations/:productoId')
  async deleteBillOfOperations(
    @Param('productoId') productoId: string,
    @Request() req: any,
  ) {
    const deleted = await this.prisma.billOfOperations.deleteMany({
      where: { productoId },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'RESTAURAR_BILL_OF_OPERATIONS',
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ productoId }),
      },
    });

    return deleted;
  }

  private async inicializarOperaciones(ordenId: string, productoId: string) {
    const customBoo = await this.prisma.billOfOperations.findMany({
      where: { productoId },
      orderBy: { orden: 'asc' },
    });

    const defaultWorkCenters = [
      { id: 'WC-PAST', fields: [
        { label: 'Temperatura Pasteurización', name: 'temp_pasteurizacion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Pasteurización', name: 'ph_pasteurizacion', type: 'number', required: true },
        { label: 'Temperatura Enfriamiento', name: 'temp_enfriamiento', type: 'number', required: true, suffix: '°C' },
      ]},
      { id: 'WC-CUAJ', fields: [
        { label: 'Lote de Cultivo', name: 'lote_cultivo', type: 'text', required: true },
        { label: 'Dosis de Cultivo', name: 'dosis_cultivo', type: 'number', required: true, suffix: 'g/L' },
        { label: 'Lote de Cuajo', name: 'lote_cuajo', type: 'text', required: true },
        { label: 'Dosis de Cuajo', name: 'dosis_cuajo', type: 'number', required: true, suffix: 'mL/L' },
        { label: 'Temperatura Cuajado', name: 'temp_cuajado', type: 'number', required: true, suffix: '°C' },
        { label: 'Tiempo de Reposo', name: 'tiempo_reposo', type: 'number', required: true, suffix: 'min' },
      ]},
      { id: 'WC-CORTE', fields: [
        { label: 'Tamaño de Grano', name: 'tamano_grano', type: 'text', required: true, suffix: 'mm' },
        { label: 'Tiempo de Agitación', name: 'tiempo_agitacion', type: 'number', required: true, suffix: 'min' },
        { label: 'Velocidad de Agitación', name: 'velocidad_agitacion', type: 'number', required: true, suffix: 'RPM' },
      ]},
      { id: 'WC-COCC', fields: [
        { label: 'Temperatura Cocción', name: 'temp_coccion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Final Cocción', name: 'ph_coccion', type: 'number', required: true },
      ]},
      { id: 'WC-DESU', fields: [
        { label: 'Volumen Suero Obtenido', name: 'volumen_suero', type: 'number', required: true, suffix: 'L' },
        { label: 'pH Suero', name: 'ph_suero', type: 'number', required: true },
      ]},
      { id: 'WC-MOLD', fields: [
        { label: 'Cantidad de Moldes Llenados', name: 'cantidad_moldes', type: 'number', required: true, suffix: 'uds' },
        { label: 'Tipo de Molde', name: 'tipo_molde', type: 'text', required: true },
      ]},
      { id: 'WC-PREN', fields: [
        { label: 'Presión Aplicada', name: 'presion_applied', type: 'number', required: true, suffix: 'PSI' },
        { label: 'Tiempo de Prensa', name: 'tiempo_prensa', type: 'number', required: true, suffix: 'horas' },
      ]},
      { id: 'WC-SALA', fields: [
        { label: 'Concentración Salmuera', name: 'concentracion_salmuera', type: 'number', required: true, suffix: '% o °Baumé' },
        { label: 'Temperatura Salmuera', name: 'temp_salmuera', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Salmuera', name: 'ph_salmuera', type: 'number', required: true },
      ]},
      { id: 'WC-MADU', fields: [
        { label: 'Temperatura Cámara', name: 'temp_camara', type: 'number', required: true, suffix: '°C' },
        { label: 'Humedad Relativa', name: 'humedad_relativa', type: 'number', required: true, suffix: '%' },
        { label: 'Tiempo Maduración Planificado', name: 'tiempo_maduracion_dias', type: 'number', required: true, suffix: 'días' },
      ]},
      { id: 'WC-EMPA', fields: [
        { label: 'Unidades Empacadas', name: 'unidades_empacadas', type: 'number', required: true, suffix: 'uds' },
        { label: 'Lote Bolsa/Empaque', name: 'lote_empaque', type: 'text', required: true },
        { label: 'Peso Neto Total', name: 'peso_neto_total', type: 'number', required: true, suffix: 'kg' },
      ]},
      { id: 'WC-CFRI', fields: [
        { label: 'Temperatura Almacenamiento', name: 'temp_almacenamiento', type: 'number', required: true, suffix: '°C' },
        { label: 'Ubicación/Estante en Cámara', name: 'ubicacion_camara', type: 'text', required: true },
        { label: 'Fecha Estimada Despacho', name: 'fecha_despacho_estimada', type: 'date', required: true },
      ]},
    ];

    const defaultDurations: Record<string, number> = {
      'WC-PAST': 30,
      'WC-CUAJ': 45,
      'WC-CORTE': 10,
      'WC-COCC': 20,
      'WC-DESU': 15,
      'WC-MOLD': 15,
      'WC-PREN': 120,
      'WC-SALA': 60,
      'WC-MADU': 14400,
      'WC-EMPA': 30,
      'WC-CFRI': 60,
    };

    if (customBoo.length > 0) {
      for (const step of customBoo) {
        await this.prisma.ordenProduccionOperacion.upsert({
          where: {
            ordenProduccionId_workCenter: {
              ordenProduccionId: ordenId,
              workCenter: step.workCenter,
            },
          },
          create: {
            ordenProduccionId: ordenId,
            workCenter: step.workCenter,
            estado: 'PENDIENTE',
            duracionEstimada: step.duracionEstimada,
            datosRequeridos: step.datosRequeridos,
          },
          update: {},
        });
      }
    } else {
      for (const wc of defaultWorkCenters) {
        await this.prisma.ordenProduccionOperacion.upsert({
          where: {
            ordenProduccionId_workCenter: {
              ordenProduccionId: ordenId,
              workCenter: wc.id,
            },
          },
          create: {
            ordenProduccionId: ordenId,
            workCenter: wc.id,
            estado: 'PENDIENTE',
            duracionEstimada: defaultDurations[wc.id] || 30,
            datosRequeridos: JSON.stringify(wc.fields),
          },
          update: {},
        });
      }
    }
  }
}
