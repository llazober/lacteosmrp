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

@Controller('inventario')
export class InventarioController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async obtenerInventarioGeneral(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }

    return this.prisma.inventario.findMany({
      where: filter,
      include: {
        producto: true,
        sucursal: true,
      },
      orderBy: [
        { sucursal: { nombre: 'asc' } },
        { producto: { descripcion: 'asc' } },
      ],
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post()
  async crearInventario(@Request() req: any, @Body() body: any) {
    const { productoId, sucursalId, existencia, existMin, existMax } = body;
    if (!productoId || !sucursalId) {
      throw new BadRequestException('Producto y Sucursal son obligatorios.');
    }

    const exist = await this.prisma.inventario.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
    });
    if (exist) {
      throw new BadRequestException(
        'Este producto ya está registrado en la sucursal seleccionada.',
      );
    }

    const inv = await this.prisma.inventario.create({
      data: {
        productoId,
        sucursalId,
        existencia: existencia != null ? parseFloat(existencia) : 0,
        existMin: existMin != null ? parseFloat(existMin) : 10,
        existMax: existMax != null ? parseFloat(existMax) : 100,
      },
      include: { producto: true, sucursal: true },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_INVENTARIO',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          sku: inv.producto.sku,
          sucursal: inv.sucursal.nombre,
          existencia: inv.existencia,
        }),
      },
    });

    return inv;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Put(':id')
  async actualizarInventario(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { existencia, existMin, existMax } = body;

    const prev = await this.prisma.inventario.findUnique({
      where: { id },
      include: { producto: true, sucursal: true },
    });
    if (!prev) {
      throw new BadRequestException('Registro de inventario no encontrado.');
    }

    const inv = await this.prisma.inventario.update({
      where: { id },
      data: {
        existencia: existencia != null ? parseFloat(existencia) : undefined,
        existMin: existMin != null ? parseFloat(existMin) : undefined,
        existMax: existMax != null ? parseFloat(existMax) : undefined,
      },
      include: { producto: true, sucursal: true },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_INVENTARIO',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          sku: inv.producto.sku,
          sucursal: inv.sucursal.nombre,
          cambios: {
            existencia:
              existencia != null
                ? `${prev.existencia} -> ${existencia}`
                : undefined,
            existMin:
              existMin != null ? `${prev.existMin} -> ${existMin}` : undefined,
            existMax:
              existMax != null ? `${prev.existMax} -> ${existMax}` : undefined,
          },
        }),
      },
    });

    return inv;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete(':id')
  async eliminarInventario(@Param('id') id: string, @Request() req: any) {
    const prev = await this.prisma.inventario.findUnique({
      where: { id },
      include: { producto: true, sucursal: true },
    });
    if (!prev) {
      throw new BadRequestException('Registro de inventario no encontrado.');
    }

    await this.prisma.inventario.delete({
      where: { id },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_INVENTARIO',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          sku: prev.producto.sku,
          sucursal: prev.sucursal.nombre,
        }),
      },
    });

    return { message: 'Registro de inventario eliminado correctamente.' };
  }

  // --- KARDEX / MOVIMIENTOS ---
  @Get('movimientos')
  async listarMovimientos(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.OR = [
        { sucursalOrigenId: sucursalId },
        { sucursalDestinoId: sucursalId },
      ];
    }

    return this.prisma.movimientoInventario.findMany({
      where: filter,
      include: {
        producto: true,
        lote: true,
        sucursalOrigen: true,
        sucursalDestino: true,
        usuario: { select: { nombre: true, rol: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ajuste')
  async realizarAjuste(@Request() req: any, @Body() body: any) {
    const { productoId, sucursalId, loteId, cantidad, tipo, motivo } = body;

    if (!productoId || !sucursalId || cantidad == null || !tipo || !motivo) {
      throw new BadRequestException(
        'Todos los campos son obligatorios para realizar un ajuste de inventario.',
      );
    }

    const cantNum = parseFloat(cantidad);
    if (cantNum <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor que cero.');
    }

    // Verificar / Crear registro de inventario
    const inv = await this.prisma.inventario.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
    });

    const stockActual = inv ? inv.existencia : 0;
    let nuevoStock = stockActual;

    if (tipo === 'ENTRADA') {
      nuevoStock += cantNum;
    } else if (tipo === 'SALIDA') {
      if (stockActual < cantNum) {
        throw new BadRequestException(
          `Stock insuficiente para realizar el egreso. Stock actual: ${stockActual}`,
        );
      }
      nuevoStock -= cantNum;
    } else {
      throw new BadRequestException(
        'Tipo de ajuste inválido. Debe ser ENTRADA o SALIDA.',
      );
    }

    // Ejecutar en transacción de Prisma
    const [movimiento] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.create({
        data: {
          tipo,
          productoId,
          loteId: loteId || null,
          sucursalOrigenId: tipo === 'SALIDA' ? sucursalId : null,
          sucursalDestinoId: tipo === 'ENTRADA' ? sucursalId : null,
          cantidad: cantNum,
          motivo,
          usuarioId: req.user.id,
        },
        include: { producto: true },
      }),
      this.prisma.inventario.upsert({
        where: { productoId_sucursalId: { productoId, sucursalId } },
        update: { existencia: nuevoStock },
        create: {
          productoId,
          sucursalId,
          existencia: nuevoStock,
          existMin: 10,
          existMax: 100,
        },
      }),
      // Si hay lote, ajustar la cantidad del lote si es salida
      ...(loteId
        ? [
            this.prisma.lote.update({
              where: { id: loteId },
              data: {
                cantidadActual: {
                  [tipo === 'ENTRADA' ? 'increment' : 'decrement']: cantNum,
                },
              },
            }),
          ]
        : []),
    ]);

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'AJUSTE_INVENTARIO',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          tipo,
          sku: movimiento.producto.sku,
          cantidad: cantNum,
          sucursalId,
          nuevoStock,
        }),
      },
    });

    return { message: 'Ajuste de inventario procesado con éxito.', nuevoStock };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post('merma')
  async registrarMerma(@Request() req: any, @Body() body: any) {
    const { sucursalId, productoId, loteId, cantidad, tipoMerma, motivo } =
      body;

    if (
      !sucursalId ||
      !productoId ||
      cantidad == null ||
      !tipoMerma ||
      !motivo
    ) {
      throw new BadRequestException(
        'Todos los campos son obligatorios para registrar una merma.',
      );
    }

    const cantNum = parseFloat(cantidad);
    if (cantNum <= 0) {
      throw new BadRequestException(
        'La cantidad de merma debe ser mayor que cero.',
      );
    }

    // Verificar existencias generales
    const inv = await this.prisma.inventario.findUnique({
      where: { productoId_sucursalId: { productoId, sucursalId } },
      include: { producto: true },
    });

    if (!inv) {
      throw new BadRequestException(
        'No se encontraron registros de inventario para este producto en la sucursal seleccionada.',
      );
    }

    if (inv.existencia < cantNum) {
      throw new BadRequestException(
        `Existencias insuficientes en inventario general. Stock actual: ${inv.existencia}`,
      );
    }

    // Si se pasa lote, verificar stock en el lote
    if (loteId) {
      const lote = await this.prisma.lote.findUnique({
        where: { id: loteId },
      });
      if (!lote) {
        throw new BadRequestException('El lote seleccionado no existe.');
      }
      if (lote.cantidadActual < cantNum) {
        throw new BadRequestException(
          `Existencias insuficientes en el lote seleccionado. Stock del lote: ${lote.cantidadActual}`,
        );
      }
    }

    const nuevoStock = inv.existencia - cantNum;

    // Ejecutar en transacción de Prisma
    const [movimiento] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.create({
        data: {
          tipo: 'MERMA',
          productoId,
          loteId: loteId || null,
          sucursalOrigenId: sucursalId,
          sucursalDestinoId: null,
          cantidad: cantNum,
          motivo: `[${tipoMerma}] ${motivo}`,
          usuarioId: req.user.id,
        },
        include: { producto: true },
      }),
      this.prisma.inventario.update({
        where: { id: inv.id },
        data: { existencia: nuevoStock },
      }),
      ...(loteId
        ? [
            this.prisma.lote.update({
              where: { id: loteId },
              data: { cantidadActual: { decrement: cantNum } },
            }),
          ]
        : []),
    ]);

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'REGISTRAR_MERMA',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          tipoMerma,
          sku: inv.producto.sku,
          cantidad: cantNum,
          sucursalId,
          nuevoStock,
          motivo,
        }),
      },
    });

    return {
      message: 'Merma registrada con éxito.',
      nuevoStock,
      movimientoId: movimiento.id,
    };
  }

  // --- TRANSFERENCIAS INTER-SUCURSAL ---
  @Get('transferencias')
  async listarTransferencias(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.OR = [{ origenId: sucursalId }, { destinoId: sucursalId }];
    }

    return this.prisma.transferencia.findMany({
      where: filter,
      include: {
        origen: true,
        destino: true,
        creadoPor: { select: { nombre: true } },
        recibidoPor: { select: { nombre: true } },
        detalles: {
          include: {
            producto: true,
            lote: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post('transferencias')
  async crearTransferencia(@Request() req: any, @Body() body: any) {
    const { origenId, destinoId, productos } = body; // productos: [{ productoId, loteId, cantidad }]

    if (!origenId || !destinoId || !productos || productos.length === 0) {
      throw new BadRequestException(
        'Origen, destino y al menos un producto son requeridos.',
      );
    }

    if (origenId === destinoId) {
      throw new BadRequestException(
        'La sucursal de origen y destino no pueden ser iguales.',
      );
    }

    // Generar código único
    const count = await this.prisma.transferencia.count();
    const codigo = `TR-${String(count + 1).padStart(5, '0')}`;

    // Crear transferencia y detalles en transacción
    const transferencia = await this.prisma.$transaction(async (tx) => {
      // 1. Crear cabecera
      const tr = await tx.transferencia.create({
        data: {
          codigo,
          origenId,
          destinoId,
          estado: 'PENDIENTE',
          creadoPorId: req.user.id,
        },
      });

      // 2. Crear detalles
      for (const prod of productos) {
        // Verificar existencia en origen
        const invOrigen = await tx.inventario.findUnique({
          where: {
            productoId_sucursalId: {
              productoId: prod.productoId,
              sucursalId: origenId,
            },
          },
        });

        if (!invOrigen || invOrigen.existencia < parseFloat(prod.cantidad)) {
          throw new BadRequestException(
            `Stock insuficiente en sucursal de origen para el producto seleccionado. Disponible: ${invOrigen ? invOrigen.existencia : 0}`,
          );
        }

        await tx.transferenciaDetalle.create({
          data: {
            transferenciaId: tr.id,
            productoId: prod.productoId,
            loteId: prod.loteId,
            cantidad: parseFloat(prod.cantidad),
          },
        });
      }

      return tr;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'SOLICITAR_TRANSFERENCIA',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          id: transferencia.id,
          codigo: transferencia.codigo,
        }),
      },
    });

    return transferencia;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Put('transferencias/:id/estado')
  async cambiarEstadoTransferencia(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { estado } = body; // EN_TRANSITO, RECIBIDA, RECHAZADA
    if (!estado) {
      throw new BadRequestException('El nuevo estado es requerido.');
    }

    const tr = await this.prisma.transferencia.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!tr) {
      throw new BadRequestException('Transferencia no encontrada.');
    }

    if (tr.estado === 'RECIBIDA' || tr.estado === 'RECHAZADA') {
      throw new BadRequestException(
        'La transferencia ya se encuentra finalizada.',
      );
    }

    const updatedTr = await this.prisma.$transaction(async (tx) => {
      // Si pasa a EN_TRANSITO: descontar stock de origen
      if (estado === 'EN_TRANSITO' && tr.estado === 'PENDIENTE') {
        for (const det of tr.detalles) {
          await tx.inventario.update({
            where: {
              productoId_sucursalId: {
                productoId: det.productoId,
                sucursalId: tr.origenId,
              },
            },
            data: { existencia: { decrement: det.cantidad } },
          });

          // Registrar movimiento de salida
          await tx.movimientoInventario.create({
            data: {
              tipo: 'SALIDA',
              productoId: det.productoId,
              loteId: det.loteId,
              sucursalOrigenId: tr.origenId,
              cantidad: det.cantidad,
              motivo: `Despacho transferencia ${tr.codigo}`,
              usuarioId: req.user.id,
            },
          });
        }
      }

      // Si pasa a RECIBIDA: sumar stock a destino
      if (estado === 'RECIBIDA') {
        // Si no se pasó por EN_TRANSITO previamente (ej. recepción directa), descontar origen primero
        if (tr.estado === 'PENDIENTE') {
          for (const det of tr.detalles) {
            await tx.inventario.update({
              where: {
                productoId_sucursalId: {
                  productoId: det.productoId,
                  sucursalId: tr.origenId,
                },
              },
              data: { existencia: { decrement: det.cantidad } },
            });
            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: det.productoId,
                loteId: det.loteId,
                sucursalOrigenId: tr.origenId,
                cantidad: det.cantidad,
                motivo: `Despacho transferencia directa ${tr.codigo}`,
                usuarioId: req.user.id,
              },
            });
          }
        }

        for (const det of tr.detalles) {
          // Aumentar existencia en destino
          await tx.inventario.upsert({
            where: {
              productoId_sucursalId: {
                productoId: det.productoId,
                sucursalId: tr.destinoId,
              },
            },
            update: { existencia: { increment: det.cantidad } },
            create: {
              productoId: det.productoId,
              sucursalId: tr.destinoId,
              existencia: det.cantidad,
              existMin: 5,
              existMax: 100,
            },
          });

          // Registrar movimiento de entrada en destino
          await tx.movimientoInventario.create({
            data: {
              tipo: 'ENTRADA',
              productoId: det.productoId,
              loteId: det.loteId,
              sucursalDestinoId: tr.destinoId,
              cantidad: det.cantidad,
              motivo: `Recepción transferencia ${tr.codigo}`,
              usuarioId: req.user.id,
            },
          });
        }
      }

      // Actualizar cabecera
      return tx.transferencia.update({
        where: { id },
        data: {
          estado,
          fechaRecepcion: estado === 'RECIBIDA' ? new Date() : undefined,
          recibidoPorId:
            estado === 'RECIBIDA' || estado === 'RECHAZADA'
              ? req.user.id
              : undefined,
        },
      });
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `PROCESAR_TRANSFERENCIA_${estado}`,
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({ id, codigo: tr.codigo, estado }),
      },
    });

    return updatedTr;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post('transferencias/recepcion-grupal')
  async recepcionGrupal(@Request() req: any, @Body() body: any) {
    const { transferenciaIds, recibidoPorNombre, firmaBase64, pin } = body;

    if (!pin) {
      throw new BadRequestException('El PIN de autorización es requerido.');
    }

    const dbUser = await this.prisma.usuario.findUnique({
      where: { id: req.user.id },
    });

    if (!dbUser || dbUser.pin !== pin) {
      throw new BadRequestException('El PIN de autorización ingresado es incorrecto.');
    }

    if (
      !transferenciaIds ||
      !Array.isArray(transferenciaIds) ||
      transferenciaIds.length === 0
    ) {
      throw new BadRequestException(
        'Se requieren IDs de transferencia para procesar.',
      );
    }

    if (!recibidoPorNombre) {
      throw new BadRequestException('El nombre del receptor es requerido.');
    }

    // 1. Obtener todas las transferencias a procesar
    const transferencias = await this.prisma.transferencia.findMany({
      where: { id: { in: transferenciaIds } },
      include: { detalles: true },
    });

    if (transferencias.length === 0) {
      throw new BadRequestException(
        'No se encontraron transferencias válidas.',
      );
    }

    // Filtrar aquellas que ya están recibidas o rechazadas
    const validTrans = transferencias.filter(
      (tr) => tr.estado !== 'RECIBIDA' && tr.estado !== 'RECHAZADA',
    );
    if (validTrans.length === 0) {
      throw new BadRequestException(
        'Todas las transferencias seleccionadas ya están finalizadas.',
      );
    }

    // 2. Procesar en una transacción
    await this.prisma.$transaction(async (tx) => {
      for (const tr of validTrans) {
        // Si estaba en PENDIENTE, hay que descontar del origen primero
        if (tr.estado === 'PENDIENTE') {
          for (const det of tr.detalles) {
            await tx.inventario.update({
              where: {
                productoId_sucursalId: {
                  productoId: det.productoId,
                  sucursalId: tr.origenId,
                },
              },
              data: { existencia: { decrement: det.cantidad } },
            });

            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: det.productoId,
                loteId: det.loteId,
                sucursalOrigenId: tr.origenId,
                cantidad: det.cantidad,
                motivo: `Despacho transferencia directa (Recepción Grupal) ${tr.codigo}`,
                usuarioId: req.user.id,
              },
            });
          }
        }

        // Sumar al destino
        for (const det of tr.detalles) {
          await tx.inventario.upsert({
            where: {
              productoId_sucursalId: {
                productoId: det.productoId,
                sucursalId: tr.destinoId,
              },
            },
            update: { existencia: { increment: det.cantidad } },
            create: {
              productoId: det.productoId,
              sucursalId: tr.destinoId,
              existencia: det.cantidad,
              existMin: 5,
              existMax: 100,
            },
          });

          await tx.movimientoInventario.create({
            data: {
              tipo: 'ENTRADA',
              productoId: det.productoId,
              loteId: det.loteId,
              sucursalDestinoId: tr.destinoId,
              cantidad: det.cantidad,
              motivo: `Recepción transferencia (Recepción Grupal) ${tr.codigo}`,
              usuarioId: req.user.id,
            },
          });
        }

        // Actualizar cabecera de la transferencia
        await tx.transferencia.update({
          where: { id: tr.id },
          data: {
            estado: 'RECIBIDA',
            fechaRecepcion: new Date(),
            recibidoPorId: req.user.id,
          },
        });
      }
    });

    // 3. Crear registro de Auditoría centralizada con los detalles y la firma
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'RECEPCION_GRUPAL_TRANSFERENCIAS',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          transferenciasProcesadas: validTrans.map((t) => ({
            id: t.id,
            codigo: t.codigo,
          })),
          recibidoPorNombre,
          firmaBase64,
        }),
      },
    });

    return {
      mensaje: 'Recepción grupal procesada con éxito.',
      cantidadProcesada: validTrans.length,
    };
  }
}
