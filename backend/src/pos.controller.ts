import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';
import { getTimezoneOffsetMinutes } from './utils/timezone';

@Controller('pos')
export class PosController {
  constructor(private prisma: PrismaService) {}

  // --- CONTROL DE CAJA ---
  @Get('caja/estado')
  async verificarCaja(@Request() req: any) {
    const user = req.user;

    const cajaAbierta = await this.prisma.cajaControl.findFirst({
      where: {
        cajeroId: user.id,
        estado: 'ABIERTA',
      },
      include: { sucursal: true },
    });

    return {
      abierta: !!cajaAbierta,
      caja: cajaAbierta || null,
    };
  }

  @Post('caja/apertura')
  async abrirCaja(@Request() req: any, @Body() body: any) {
    const user = req.user;
    const { montoApertura } = body;

    if (!user.sucursalId) {
      throw new BadRequestException(
        'El usuario debe estar asignado a una sucursal para abrir una caja.',
      );
    }

    if (montoApertura == null || parseFloat(montoApertura) < 0) {
      throw new BadRequestException(
        'El monto de apertura debe ser mayor o igual a cero.',
      );
    }

    // Verificar si ya tiene caja abierta
    const cajaExistente = await this.prisma.cajaControl.findFirst({
      where: {
        cajeroId: user.id,
        estado: 'ABIERTA',
      },
    });

    if (cajaExistente) {
      throw new BadRequestException('Ya tiene una caja abierta activa.');
    }

    const caja = await this.prisma.cajaControl.create({
      data: {
        sucursalId: user.sucursalId,
        cajeroId: user.id,
        montoApertura: parseFloat(montoApertura),
        estado: 'ABIERTA',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'APERTURA_CAJA',
        modulo: 'POS',
        detalles: JSON.stringify({ id: caja.id, montoApertura }),
      },
    });

    return caja;
  }

  @Post('caja/cierre')
  async cerrarCaja(@Request() req: any, @Body() body: any) {
    const user = req.user;
    const { montoArqueo } = body; // Lo que realmente contó el cajero

    if (montoArqueo == null || parseFloat(montoArqueo) < 0) {
      throw new BadRequestException(
        'El monto de arqueo es obligatorio y debe ser mayor o igual a cero.',
      );
    }

    // Buscar caja abierta
    const caja = await this.prisma.cajaControl.findFirst({
      where: {
        cajeroId: user.id,
        estado: 'ABIERTA',
      },
    });

    if (!caja) {
      throw new BadRequestException(
        'No se encontró ninguna caja abierta para este cajero.',
      );
    }

    // Calcular ventas totales asociadas a esta caja
    const ventas = await this.prisma.venta.findMany({
      where: {
        cajaAperturaId: caja.id,
        estado: 'COMPLETADA',
      },
    });

    const totalVendido = ventas.reduce((acc, v) => acc + v.total, 0);
    const montoEsperado = caja.montoApertura + totalVendido;
    const diferencia = parseFloat(montoArqueo) - montoEsperado;

    const cajaCerrada = await this.prisma.cajaControl.update({
      where: { id: caja.id },
      data: {
        estado: 'CERRADA',
        fechaCierre: new Date(),
        montoCierre: totalVendido,
        montoArqueo: parseFloat(montoArqueo),
        diferencia,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'CIERRE_CAJA',
        modulo: 'POS',
        detalles: JSON.stringify({
          id: caja.id,
          montoApertura: caja.montoApertura,
          ventasTotales: totalVendido,
          montoEsperado,
          montoReal: montoArqueo,
          diferencia,
        }),
      },
    });

    return {
      caja: cajaCerrada,
      resumen: {
        montoApertura: caja.montoApertura,
        ventasTotales: totalVendido,
        montoEsperado,
        montoReal: parseFloat(montoArqueo),
        diferencia,
      },
    };
  }

  // --- TRANSACCION DE VENTA ---
  @Get('ventas')
  async listarVentas(
    @Request() req: any,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('sucursalId') querySucursalId?: string,
  ) {
    const user = req.user;
    const isHQ = user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR';

    const filter: any = {};

    // Branch filter rule
    if (isHQ) {
      if (querySucursalId) {
        filter.sucursalId = querySucursalId;
      }
    } else {
      filter.sucursalId = user.sucursalId;
    }

    const { offsetMinutes: tzOffset, offsetStr } =
      await getTimezoneOffsetMinutes(this.prisma);

    // Date range filter
    if (fechaInicio || fechaFin) {
      filter.fecha = {};
      if (fechaInicio) {
        filter.fecha.gte = new Date(`${fechaInicio}T00:00:00${offsetStr}`);
      }
      if (fechaFin) {
        // Use 23:59:59 to capture the full end date
        filter.fecha.lte = new Date(`${fechaFin}T23:59:59${offsetStr}`);
      }
    } else {
      // Default: current calendar month in local timezone context
      const nowLocal = new Date(new Date().getTime() + tzOffset * 60 * 1000);

      const firstDayLocal = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth(),
        1,
        0,
        0,
        0,
      );
      const lastDayLocal = new Date(
        nowLocal.getFullYear(),
        nowLocal.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      filter.fecha = {
        gte: new Date(firstDayLocal.getTime() - tzOffset * 60 * 1000),
        lte: new Date(lastDayLocal.getTime() - tzOffset * 60 * 1000),
      };
    }

    return this.prisma.venta.findMany({
      where: filter,
      include: {
        cajero: { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
        detalles: { include: { producto: true, lote: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Post('venta')
  async registrarVenta(@Request() req: any, @Body() body: any) {
    const user = req.user;
    const { clienteNombre, clienteDocumento, metodoPago, productos } = body;
    // productos: [{ productoId, loteId, cantidad, precioUnitario }]

    if (!user.sucursalId) {
      throw new BadRequestException(
        'El cajero debe estar asignado a una sucursal para realizar ventas.',
      );
    }

    if (!metodoPago || !productos || productos.length === 0) {
      throw new BadRequestException(
        'El método de pago y la lista de productos son obligatorios.',
      );
    }

    // 1. Verificar si la caja está abierta
    const caja = await this.prisma.cajaControl.findFirst({
      where: {
        cajeroId: user.id,
        estado: 'ABIERTA',
      },
    });

    if (!caja) {
      throw new BadRequestException(
        'No puede realizar ventas si no ha abierto su caja de control.',
      );
    }

    // 2. Ejecutar transacción de venta
    const venta = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalIva = 0;
      let total = 0;

      // Calcular montos y validar existencias
      const detallesAcrear: any[] = [];

      for (const prod of productos) {
        const dbProd = await tx.producto.findUnique({
          where: { id: prod.productoId },
        });

        if (!dbProd || dbProd.estado !== 'ACTIVO') {
          throw new BadRequestException(
            `El producto con ID ${prod.productoId} no existe o no está activo.`,
          );
        }

        const dbLote = await tx.lote.findUnique({
          where: { id: prod.loteId },
        });

        if (!dbLote || dbLote.estado !== 'APROBADO') {
          throw new BadRequestException(
            `El lote no está disponible o no tiene calidad aprobada.`,
          );
        }

        const cantNum = parseFloat(prod.cantidad);
        if (dbProd && dbProd.unidadMedida.toUpperCase() === 'UNIDAD' && cantNum % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto "${dbProd.descripcion}" (Unidades), la cantidad de venta debe ser un número entero.`,
          );
        }
        if (dbLote.cantidadActual < cantNum) {
          throw new BadRequestException(
            `El lote "${dbLote.numeroLote}" no tiene stock suficiente para la venta. Disponible: ${dbLote.cantidadActual}`,
          );
        }

        const targetBodega = await this.obtenerBodegaParaProducto(user.sucursalId, prod.productoId, tx);
        if (!targetBodega) {
          throw new BadRequestException('No se encontró bodega para el producto.');
        }

        const invs = await tx.inventario.findMany({
          where: {
            productoId: prod.productoId,
            bodegaId: targetBodega.id,
          },
        });

        const existenciaTotal = invs.reduce((sum, i) => sum + i.existencia, 0);

        if (existenciaTotal < cantNum) {
          throw new BadRequestException(
            `Stock insuficiente en el inventario de la sucursal para el producto "${dbProd.descripcion}".`,
          );
        }

        const precio = parseFloat(prod.precioUnitario);
        const sub = precio * cantNum;
        const ivaCalculado = sub * dbProd.iva;
        const tot = sub + ivaCalculado;

        subtotal += sub;
        totalIva += ivaCalculado;
        total += tot;

        detallesAcrear.push({
          productoId: prod.productoId,
          loteId: prod.loteId,
          cantidad: cantNum,
          precioUnitario: precio,
          subtotal: sub,
          iva: dbProd.iva,
          total: tot,
        });

        // 3. Descontar lote
        await tx.lote.update({
          where: { id: prod.loteId },
          data: { cantidadActual: { decrement: cantNum } },
        });

        // 4. Descontar inventario sucursal
        let cantRestante = cantNum;
        const sortedInvs = [...invs].sort((a, b) => {
          if (a.binId === null) return -1;
          if (b.binId === null) return 1;
          return b.existencia - a.existencia;
        });

        for (const inv of sortedInvs) {
          if (cantRestante <= 0) break;
          const aDeducir = Math.min(inv.existencia, cantRestante);
          await tx.inventario.update({
            where: { id: inv.id },
            data: { existencia: { decrement: aDeducir } },
          });
          cantRestante -= aDeducir;
        }

        if (cantRestante > 0 && sortedInvs.length > 0) {
          await tx.inventario.update({
            where: { id: sortedInvs[0].id },
            data: { existencia: { decrement: cantRestante } },
          });
        }

        // 5. Registrar movimiento de stock (Kardex)
        await tx.movimientoInventario.create({
          data: {
            tipo: 'SALIDA',
            productoId: prod.productoId,
            loteId: prod.loteId,
            sucursalOrigenId: user.sucursalId,
            bodegaOrigenId: targetBodega.id,
            cantidad: cantNum,
            motivo: 'Venta rápida POS ticket',
            usuarioId: user.id,
          },
        });
      }

      // 6. Generar correlativo de ticket
      const totalVentas = await tx.venta.count();
      const ticketNumero = `T-${String(totalVentas + 1).padStart(7, '0')}`;

      // 7. Crear la Venta
      const v = await tx.venta.create({
        data: {
          ticketNumero,
          sucursalId: user.sucursalId,
          clienteNombre: clienteNombre || 'Consumidor Final',
          clienteDocumento: clienteDocumento || 'S/D',
          metodoPago,
          subtotal,
          iva: totalIva,
          total,
          cajeroId: user.id,
          cajaAperturaId: caja.id,
        },
      });

      // 8. Crear los detalles
      for (const det of detallesAcrear) {
        await tx.ventaDetalle.create({
          data: {
            ventaId: v.id,
            ...det,
          },
        });
      }

      return v;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'REGISTRAR_VENTA',
        modulo: 'POS',
        detalles: JSON.stringify({
          id: venta.id,
          ticket: venta.ticketNumero,
          total: venta.total,
        }),
      },
    });

    // Retornar venta completa con detalles
    return this.prisma.venta.findUnique({
      where: { id: venta.id },
      include: {
        detalles: {
          include: { producto: true, lote: true },
        },
        sucursal: true,
      },
    });
  }

  @Post('venta/:id/anular')
  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'GERENTE_TIENDA')
  async anularVenta(@Param('id') id: string, @Request() req: any) {
    const user = req.user;

    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: { detalles: true },
    });

    if (!venta) {
      throw new BadRequestException('La venta especificada no existe.');
    }

    if (venta.estado === 'ANULADA') {
      throw new BadRequestException('Esta venta ya se encuentra anulada.');
    }

    const ventaAnulada = await this.prisma.$transaction(async (tx) => {
      const updatedVenta = await tx.venta.update({
        where: { id },
        data: { estado: 'ANULADA' },
      });

      for (const det of venta.detalles) {
        await tx.lote.update({
          where: { id: det.loteId },
          data: { cantidadActual: { increment: det.cantidad } },
        });

        const targetBodega = await this.obtenerBodegaParaProducto(venta.sucursalId, det.productoId, tx);
        if (!targetBodega) {
          throw new BadRequestException('No se encontró bodega para el producto.');
        }

        const existingInv = await tx.inventario.findFirst({
          where: {
            productoId: det.productoId,
            bodegaId: targetBodega.id,
            binId: null,
          },
        });
        if (existingInv) {
          await tx.inventario.update({
            where: { id: existingInv.id },
            data: { existencia: { increment: det.cantidad } },
          });
        } else {
          await tx.inventario.create({
            data: {
              productoId: det.productoId,
              sucursalId: venta.sucursalId,
              bodegaId: targetBodega.id,
              binId: null,
              existencia: det.cantidad,
              existMin: 5,
              existMax: 100,
            },
          });
        }

        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: det.productoId,
            loteId: det.loteId,
            sucursalDestinoId: venta.sucursalId,
            bodegaDestinoId: targetBodega.id,
            cantidad: det.cantidad,
            motivo: `Devolución por anulación de venta ${venta.ticketNumero}`,
            usuarioId: user.id,
          },
        });
      }

      return updatedVenta;
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'ANULAR_VENTA',
        modulo: 'POS',
        detalles: JSON.stringify({
          id: venta.id,
          ticketNumero: venta.ticketNumero,
          total: venta.total,
        }),
      },
    });

    return ventaAnulada;
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
        } else if (prod.sku === 'MP-LECHE-CRUDA' || prod.sku === 'MP-LEC-LEF') {
          tipoBodega = 'LECHE_ENTERA';
        } else if (prod.sku === 'MP-LEC-LDF') {
          tipoBodega = 'LECHE_DESCREMADA';
        } else if (prod.sku === 'MP-LEC-LDEP') {
          tipoBodega = 'INSUMOS';
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
