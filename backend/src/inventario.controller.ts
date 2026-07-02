import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('inventario')
export class InventarioController {
  constructor(private prisma: PrismaService) {}

  @Get('tanque-leche')
  async obtenerEstadoTanqueLeche() {
    // 1. Encontrar los lotes de MP-LECHE-CRUDA con stock activo
    const lotes = await this.prisma.lote.findMany({
      where: {
        producto: { sku: 'MP-LECHE-CRUDA' },
        cantidadActual: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' }, // FIFO or insertion order for color consistency
    });

    const coloresPaleta = [
      '#10B981', // Emerald Green
      '#F59E0B', // Amber Yellow
      '#3B82F6', // Blue
      '#EC4899', // Pink
      '#8B5CF6', // Purple
      '#EF4444', // Red
      '#06B6D4', // Cyan
      '#14B8A6', // Teal
    ];

    const lotesConColor = lotes.map((l, index) => ({
      ...l,
      color: coloresPaleta[index % coloresPaleta.length],
    }));

    const totalLitros = lotes.reduce((sum, l) => sum + l.cantidadActual, 0);
    const capacidadMax = 10000;

    // 2. Obtener historial de mezclas para trazabilidad
    const mezclas = await this.prisma.mezclaLeche.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        loteMixto: true,
        ordenProduccion: {
          include: { receta: true }
        },
        componentes: {
          include: {
            loteOrigen: true,
          },
        },
      },
    });

    return {
      capacidadMax,
      totalLitros,
      lotes: lotesConColor,
      mezclas,
    };
  }

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
        bodega: true,
        bin: true,
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
    const { productoId, sucursalId, bodegaId, binId, existencia, existMin, existMax } = body;
    if (!productoId || !sucursalId) {
      throw new BadRequestException('Producto y Sucursal son obligatorios.');
    }

    let targetBodegaId = bodegaId;
    if (!targetBodegaId) {
      const defaultBodega = await this.obtenerBodegaParaProducto(sucursalId, productoId);
      if (!defaultBodega) {
        throw new BadRequestException('No se encontró ninguna bodega para la sucursal.');
      }
      targetBodegaId = defaultBodega.id;
    }

    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (producto && producto.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (
        (existencia != null && parseFloat(existencia) % 1 !== 0) ||
        (existMin != null && parseFloat(existMin) % 1 !== 0) ||
        (existMax != null && parseFloat(existMax) % 1 !== 0)
      ) {
        throw new BadRequestException(
          'Para productos en Unidades, las existencias deben ser números enteros.',
        );
      }
    }

    const exist = await this.prisma.inventario.findUnique({
      where: { productoId_bodegaId: { productoId, bodegaId: targetBodegaId } },
    });
    if (exist) {
      throw new BadRequestException(
        'Este producto ya está registrado en la bodega seleccionada.',
      );
    }

    const inv = await this.prisma.inventario.create({
      data: {
        productoId,
        sucursalId,
        bodegaId: targetBodegaId,
        binId: binId || null,
        existencia: existencia != null ? parseFloat(existencia) : 0,
        existMin: existMin != null ? parseFloat(existMin) : 10,
        existMax: existMax != null ? parseFloat(existMax) : 100,
      },
      include: { producto: true, sucursal: true, bodega: true, bin: true },
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
          binId: inv.binId,
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
    const { existencia, existMin, existMax, binId } = body;

    const prev = await this.prisma.inventario.findUnique({
      where: { id },
      include: { producto: true, sucursal: true },
    });
    if (!prev) {
      throw new BadRequestException('Registro de inventario no encontrado.');
    }

    if (prev.producto.unidadMedida.toUpperCase() === 'UNIDAD') {
      if (
        (existencia != null && parseFloat(existencia) % 1 !== 0) ||
        (existMin != null && parseFloat(existMin) % 1 !== 0) ||
        (existMax != null && parseFloat(existMax) % 1 !== 0)
      ) {
        throw new BadRequestException(
          'Para productos en Unidades, las existencias deben ser números enteros.',
        );
      }
    }

    const inv = await this.prisma.inventario.update({
      where: { id },
      data: {
        existencia: existencia != null ? parseFloat(existencia) : undefined,
        existMin: existMin != null ? parseFloat(existMin) : undefined,
        existMax: existMax != null ? parseFloat(existMax) : undefined,
        binId: binId !== undefined ? (binId || null) : undefined,
      },
      include: { producto: true, sucursal: true, bin: true },
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
        bodegaOrigen: true,
        bodegaDestino: true,
        usuario: { select: { nombre: true, rol: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('ajuste')
  async realizarAjuste(@Request() req: any, @Body() body: any) {
    const { productoId, sucursalId, bodegaId, loteId, cantidad, tipo, motivo } = body;

    if (!productoId || !sucursalId || cantidad == null || !tipo || !motivo) {
      throw new BadRequestException(
        'Todos los campos son obligatorios para realizar un ajuste de inventario.',
      );
    }

    const cantNum = parseFloat(cantidad);
    if (cantNum <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor que cero.');
    }

    const prod = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (prod && prod.unidadMedida.toUpperCase() === 'UNIDAD' && cantNum % 1 !== 0) {
      throw new BadRequestException(
        'Para productos en Unidades, la cantidad de ajuste debe ser un número entero.',
      );
    }

    let targetBodegaId = bodegaId;
    if (!targetBodegaId) {
      const defaultBodega = await this.obtenerBodegaParaProducto(sucursalId, productoId);
      if (!defaultBodega) {
        throw new BadRequestException('No se encontró ninguna bodega para la sucursal.');
      }
      targetBodegaId = defaultBodega.id;
    }

    // Verificar / Crear registro de inventario
    const inv = await this.prisma.inventario.findUnique({
      where: { productoId_bodegaId: { productoId, bodegaId: targetBodegaId } },
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
          bodegaOrigenId: tipo === 'SALIDA' ? targetBodegaId : null,
          bodegaDestinoId: tipo === 'ENTRADA' ? targetBodegaId : null,
          cantidad: cantNum,
          motivo,
          usuarioId: req.user.id,
        },
        include: { producto: true },
      }),
      this.prisma.inventario.upsert({
        where: { productoId_bodegaId: { productoId, bodegaId: targetBodegaId } },
        update: { existencia: nuevoStock },
        create: {
          productoId,
          sucursalId,
          bodegaId: targetBodegaId,
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
          bodegaId: targetBodegaId,
          nuevoStock,
        }),
      },
    });

    return { message: 'Ajuste de inventario procesado con éxito.', nuevoStock };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'GERENTE_TIENDA')
  @Post('merma')
  async registrarMerma(@Request() req: any, @Body() body: any) {
    const { sucursalId, bodegaId, productoId, loteId, cantidad, tipoMerma, motivo } =
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

    const prod = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });
    if (prod && prod.unidadMedida.toUpperCase() === 'UNIDAD' && cantNum % 1 !== 0) {
      throw new BadRequestException(
        'Para productos en Unidades, la cantidad de merma debe ser un número entero.',
      );
    }

    let targetBodegaId = bodegaId;
    if (!targetBodegaId) {
      const defaultBodega = await this.obtenerBodegaParaProducto(sucursalId, productoId);
      if (!defaultBodega) {
        throw new BadRequestException('No se encontró ninguna bodega para la sucursal.');
      }
      targetBodegaId = defaultBodega.id;
    }

    // Verificar existencias generales
    const inv = await this.prisma.inventario.findUnique({
      where: { productoId_bodegaId: { productoId, bodegaId: targetBodegaId } },
      include: { producto: true },
    });

    if (!inv) {
      throw new BadRequestException(
        'No se encontraron registros de inventario para este producto en la bodega seleccionada.',
      );
    }

    if (inv.existencia < cantNum) {
      throw new BadRequestException(
        `Existencias insuficientes en inventario. Stock actual: ${inv.existencia}`,
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
          bodegaOrigenId: targetBodegaId,
          bodegaDestinoId: null,
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
          bodegaId: targetBodegaId,
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
        const prodDb = await tx.producto.findUnique({
          where: { id: prod.productoId },
        });
        const qtyNum = parseFloat(prod.cantidad);
        if (prodDb && prodDb.unidadMedida.toUpperCase() === 'UNIDAD' && qtyNum % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto "${prodDb.descripcion}" (Unidades), la cantidad a transferir debe ser un número entero.`,
          );
        }

        const defaultBodegaOrigen = await this.obtenerBodegaParaProducto(origenId, prod.productoId, tx);
        if (!defaultBodegaOrigen) {
          throw new BadRequestException('No se encontró ninguna bodega para la sucursal de origen.');
        }

        // Verificar existencia en origen
        const invOrigen = await tx.inventario.findUnique({
          where: {
            productoId_bodegaId: {
              productoId: prod.productoId,
              bodegaId: defaultBodegaOrigen.id,
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
          const bodOrigen = await this.obtenerBodegaParaProducto(tr.origenId, det.productoId, tx);
          if (!bodOrigen) {
            throw new BadRequestException('No se encontró bodega de origen.');
          }

          await tx.inventario.update({
            where: {
              productoId_bodegaId: {
                productoId: det.productoId,
                bodegaId: bodOrigen.id,
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
              bodegaOrigenId: bodOrigen.id,
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
            const bodOrigen = await this.obtenerBodegaParaProducto(tr.origenId, det.productoId, tx);
            if (!bodOrigen) {
              throw new BadRequestException('No se encontró bodega de origen.');
            }

            await tx.inventario.update({
              where: {
                productoId_bodegaId: {
                  productoId: det.productoId,
                  bodegaId: bodOrigen.id,
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
                bodegaOrigenId: bodOrigen.id,
                cantidad: det.cantidad,
                motivo: `Despacho transferencia directa ${tr.codigo}`,
                usuarioId: req.user.id,
              },
            });
          }
        }

        for (const det of tr.detalles) {
          const bodDestino = await this.obtenerBodegaParaProducto(tr.destinoId, det.productoId, tx);
          if (!bodDestino) {
            throw new BadRequestException('No se encontró bodega de destino.');
          }

          // Aumentar existencia en destino
          await tx.inventario.upsert({
            where: {
              productoId_bodegaId: {
                productoId: det.productoId,
                bodegaId: bodDestino.id,
              },
            },
            update: { existencia: { increment: det.cantidad } },
            create: {
              productoId: det.productoId,
              sucursalId: tr.destinoId,
              bodegaId: bodDestino.id,
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
              bodegaDestinoId: bodDestino.id,
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
            const bodOrigen = await this.obtenerBodegaParaProducto(tr.origenId, det.productoId, tx);
            if (!bodOrigen) throw new BadRequestException('No se encontró bodega de origen.');

            await tx.inventario.update({
              where: {
                productoId_bodegaId: {
                  productoId: det.productoId,
                  bodegaId: bodOrigen.id,
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
                bodegaOrigenId: bodOrigen.id,
                cantidad: det.cantidad,
                motivo: `Despacho transferencia directa (Recepción Grupal) ${tr.codigo}`,
                usuarioId: req.user.id,
              },
            });
          }
        }

        // Sumar al destino
        for (const det of tr.detalles) {
          const bodDestino = await this.obtenerBodegaParaProducto(tr.destinoId, det.productoId, tx);
          if (!bodDestino) {
            throw new BadRequestException('No se encontró bodega de destino.');
          }

          await tx.inventario.upsert({
            where: {
              productoId_bodegaId: {
                productoId: det.productoId,
                bodegaId: bodDestino.id,
              },
            },
            update: { existencia: { increment: det.cantidad } },
            create: {
              productoId: det.productoId,
              sucursalId: tr.destinoId,
              bodegaId: bodDestino.id,
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
              bodegaDestinoId: bodDestino.id,
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

  // --- BODEGAS CRUD & METODOS AUXILIARES ---
  @Get('bodegas')
  async listarBodegas(@Query('sucursalId') sucursalId?: string) {
    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }
    return this.prisma.bodega.findMany({
      where: filter,
      include: { sucursal: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('bodegas')
  async crearBodega(@Body() body: any) {
    const { codigo, nombre, descripcion, tipoBodega, sucursalId } = body;
    if (!codigo || !nombre || !sucursalId) {
      throw new BadRequestException('Código, Nombre y Sucursal son obligatorios.');
    }

    const exist = await this.prisma.bodega.findUnique({
      where: { codigo },
    });
    if (exist) {
      throw new BadRequestException('Ya existe una bodega con este código.');
    }

    return this.prisma.bodega.create({
      data: {
        codigo,
        nombre,
        descripcion,
        tipoBodega: tipoBodega || 'GENERAL',
        sucursalId,
      },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('bodegas/:id')
  async actualizarBodega(@Param('id') id: string, @Body() body: any) {
    const { nombre, descripcion, tipoBodega, estado } = body;

    return this.prisma.bodega.update({
      where: { id },
      data: {
        nombre,
        descripcion,
        tipoBodega,
        estado,
      },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('bodegas/:id')
  async eliminarBodega(@Param('id') id: string) {
    const invCount = await this.prisma.inventario.count({
      where: {
        bodegaId: id,
        existencia: { gt: 0 },
      },
    });
    if (invCount > 0) {
      throw new BadRequestException(
        'No se puede eliminar la bodega porque tiene productos con stock disponible.',
      );
    }

    await this.prisma.inventario.deleteMany({
      where: { bodegaId: id },
    });

    await this.prisma.bodega.delete({
      where: { id },
    });

    return { message: 'Bodega eliminada correctamente.' };
  }

  // --- BINS (Sub-ubicaciones dentro de Bodegas) ---
  @Get('bodegas/:bodegaId/bins')
  async listarBins(@Param('bodegaId') bodegaId: string) {
    return this.prisma.bin.findMany({
      where: { bodegaId },
      orderBy: { codigo: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('bodegas/:bodegaId/bins')
  async crearBin(@Param('bodegaId') bodegaId: string, @Body() body: any) {
    const { codigo, nombre, capacidad, unidad } = body;
    if (!codigo || !nombre) {
      throw new BadRequestException('El código y el nombre del bin son obligatorios.');
    }

    const bodega = await this.prisma.bodega.findUnique({ where: { id: bodegaId } });
    if (!bodega) {
      throw new BadRequestException('La bodega especificada no existe.');
    }

    const exist = await this.prisma.bin.findUnique({
      where: { bodegaId_codigo: { bodegaId, codigo } },
    });
    if (exist) {
      throw new BadRequestException(`Ya existe un bin con el código "${codigo}" en esta bodega.`);
    }

    return this.prisma.bin.create({
      data: {
        codigo,
        nombre,
        bodegaId,
        capacidad: capacidad ? parseFloat(capacidad) : null,
        unidad: unidad || 'Lts',
        estado: 'ACTIVO',
      },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('bins/:id')
  async actualizarBin(@Param('id') id: string, @Body() body: any) {
    const { codigo, nombre, capacidad, unidad, estado } = body;

    const bin = await this.prisma.bin.findUnique({ where: { id } });
    if (!bin) {
      throw new BadRequestException('Bin no encontrado.');
    }

    return this.prisma.bin.update({
      where: { id },
      data: {
        codigo: codigo || undefined,
        nombre: nombre || undefined,
        capacidad: capacidad !== undefined ? (capacidad ? parseFloat(capacidad) : null) : undefined,
        unidad: unidad || undefined,
        estado: estado || undefined,
      },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('bins/:id')
  async eliminarBin(@Param('id') id: string) {
    const bin = await this.prisma.bin.findUnique({ where: { id } });
    if (!bin) {
      throw new BadRequestException('Bin no encontrado.');
    }

    const invCount = await this.prisma.inventario.count({
      where: { binId: id, existencia: { gt: 0 } },
    });
    if (invCount > 0) {
      throw new BadRequestException('No se puede eliminar el bin porque tiene productos con stock asignado.');
    }

    // Desasignar inventarios vinculados (con stock 0) antes de eliminar
    await this.prisma.inventario.updateMany({
      where: { binId: id },
      data: { binId: null },
    });

    await this.prisma.bin.delete({ where: { id } });
    return { message: 'Bin eliminado correctamente.' };
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
