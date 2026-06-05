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

@Controller('lotes')
export class LotesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listarLotes() {
    return this.prisma.lote.findMany({
      include: { producto: true, proveedor: true },
      orderBy: { fechaVencimiento: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN', 'CONTROL_CALIDAD')
  @Post()
  async crearLote(@Request() req: any, @Body() body: any) {
    const {
      numeroLote,
      productoId,
      fechaProduccion,
      fechaVencimiento,
      proveedorId,
      certificadoUrl,
      temperaturaRequeridaMin,
      temperaturaRequeridaMax,
      cantidadInicial,
    } = body;

    if (
      !numeroLote ||
      !productoId ||
      !fechaProduccion ||
      !fechaVencimiento ||
      !proveedorId ||
      cantidadInicial == null
    ) {
      throw new BadRequestException(
        'Los campos numeroLote, productoId, fechaProduccion, fechaVencimiento, proveedorId y cantidadInicial son obligatorios.',
      );
    }

    const exist = await this.prisma.lote.findUnique({ where: { numeroLote } });
    if (exist) {
      throw new BadRequestException(
        'Ya existe un lote registrado con ese número.',
      );
    }

    const lote = await this.prisma.lote.create({
      data: {
        numeroLote,
        productoId,
        fechaProduccion: new Date(fechaProduccion),
        fechaVencimiento: new Date(fechaVencimiento),
        proveedorId,
        certificadoUrl: certificadoUrl || null,
        temperaturaRequeridaMin: parseFloat(temperaturaRequeridaMin || 2.0),
        temperaturaRequeridaMax: parseFloat(temperaturaRequeridaMax || 6.0),
        cantidadInicial: parseFloat(cantidadInicial),
        cantidadActual: parseFloat(cantidadInicial),
        estado: 'APROBADO',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_LOTE',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify(lote),
      },
    });

    return lote;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CONTROL_CALIDAD')
  @Put(':id/estado')
  async cambiarEstadoLote(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { estado } = body;
    if (!estado) {
      throw new BadRequestException('El nuevo estado es requerido.');
    }

    const lote = await this.prisma.lote.update({
      where: { id },
      data: { estado },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CAMBIAR_ESTADO_LOTE',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({ id, estado }),
      },
    });

    return lote;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CONTROL_CALIDAD', 'ALMACEN')
  @Put(':id')
  async editarLote(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const {
      numeroLote,
      productoId,
      fechaProduccion,
      fechaVencimiento,
      proveedorId,
      certificadoUrl,
      temperaturaRequeridaMin,
      temperaturaRequeridaMax,
      cantidadInicial,
      cantidadActual,
      estado,
    } = body;

    const loteExistente = await this.prisma.lote.findUnique({ where: { id } });
    if (!loteExistente) {
      throw new BadRequestException('Lote no encontrado.');
    }

    if (numeroLote && numeroLote !== loteExistente.numeroLote) {
      const dupe = await this.prisma.lote.findUnique({ where: { numeroLote } });
      if (dupe) {
        throw new BadRequestException(
          'Ya existe otro lote registrado con ese número.',
        );
      }
    }

    const dataToUpdate: any = {};
    if (numeroLote !== undefined) dataToUpdate.numeroLote = numeroLote;
    if (productoId !== undefined) dataToUpdate.productoId = productoId;
    if (fechaProduccion !== undefined)
      dataToUpdate.fechaProduccion = new Date(fechaProduccion);
    if (fechaVencimiento !== undefined)
      dataToUpdate.fechaVencimiento = new Date(fechaVencimiento);
    if (proveedorId !== undefined) dataToUpdate.proveedorId = proveedorId;
    if (certificadoUrl !== undefined)
      dataToUpdate.certificadoUrl = certificadoUrl || null;
    if (temperaturaRequeridaMin !== undefined)
      dataToUpdate.temperaturaRequeridaMin = parseFloat(
        temperaturaRequeridaMin,
      );
    if (temperaturaRequeridaMax !== undefined)
      dataToUpdate.temperaturaRequeridaMax = parseFloat(
        temperaturaRequeridaMax,
      );
    if (cantidadInicial !== undefined)
      dataToUpdate.cantidadInicial = parseFloat(cantidadInicial);
    if (cantidadActual !== undefined)
      dataToUpdate.cantidadActual = parseFloat(cantidadActual);
    if (estado !== undefined) dataToUpdate.estado = estado;

    const loteActualizado = await this.prisma.lote.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'EDITAR_LOTE',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          antes: loteExistente,
          despues: loteActualizado,
        }),
      },
    });

    return loteActualizado;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete(':id')
  async eliminarLote(@Param('id') id: string, @Request() req: any) {
    const loteExistente = await this.prisma.lote.findUnique({ where: { id } });
    if (!loteExistente) {
      throw new BadRequestException('Lote no encontrado.');
    }

    const countVentas = await this.prisma.ventaDetalle.count({
      where: { loteId: id },
    });
    const countTransferencias = await this.prisma.transferenciaDetalle.count({
      where: { loteId: id },
    });
    const countMovimientos = await this.prisma.movimientoInventario.count({
      where: { loteId: id },
    });

    if (countVentas > 0 || countTransferencias > 0 || countMovimientos > 0) {
      throw new BadRequestException(
        'No se puede eliminar el lote porque posee registros históricos de movimientos, transferencias o ventas asociadas.',
      );
    }

    await this.prisma.lote.delete({ where: { id } });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_LOTE',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify(loteExistente),
      },
    });

    return { success: true, message: 'Lote eliminado exitosamente.' };
  }

  // --- TRAZABILIDAD ---
  @Get('trazabilidad/:numeroLote')
  async obtenerTrazabilidadLote(@Param('numeroLote') numeroLote: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { numeroLote },
      include: {
        producto: true,
        proveedor: true,
      },
    });

    if (!lote) {
      throw new BadRequestException('Lote no encontrado.');
    }

    // Buscar movimientos de inventario que involucran a este lote
    const movimientos = await this.prisma.movimientoInventario.findMany({
      where: { loteId: lote.id },
      include: {
        sucursalOrigen: true,
        sucursalDestino: true,
        usuario: true,
      },
      orderBy: { fecha: 'asc' },
    });

    // Buscar detalles de transferencias que involucran a este lote
    const transferenciasDetalles =
      await this.prisma.transferenciaDetalle.findMany({
        where: { loteId: lote.id },
        include: {
          transferencia: {
            include: {
              origen: true,
              destino: true,
              creadoPor: true,
              recibidoPor: true,
            },
          },
        },
        orderBy: { transferencia: { fechaEnvio: 'asc' } },
      });

    // Buscar detalles de ventas que involucran a este lote
    const ventasDetalles = await this.prisma.ventaDetalle.findMany({
      where: { loteId: lote.id },
      include: {
        venta: {
          include: {
            sucursal: true,
            cajero: true,
          },
        },
      },
      orderBy: { venta: { fecha: 'asc' } },
    });

    // Armar la línea de tiempo (Timeline)
    const timelineEvents: any[] = [];

    // Evento 1: Recepción de Proveedor (Siempre que el lote exista)
    timelineEvents.push({
      id: `recepcion-${lote.id}`,
      titulo: 'Recepción de Mercadería',
      subtitulo: `Proveedor: ${lote.proveedor.nombre}`,
      fecha: lote.createdAt,
      descripcion: `Lote ${lote.numeroLote} registrado con cantidad inicial de ${lote.cantidadInicial} ${lote.producto.unidadMedida}. Certificado de calidad: ${lote.certificadoUrl ? 'Presentado' : 'No presentado'}.`,
      tipo: 'RECEPCION',
      icon: 'local_shipping',
      temperatura: `${lote.temperaturaRequeridaMin}°C a ${lote.temperaturaRequeridaMax}°C`,
    });

    // Evento 2: Movimientos del Kardex (Almacenamiento, ajustes, etc.)
    for (const mov of movimientos) {
      timelineEvents.push({
        id: `mov-${mov.id}`,
        titulo:
          mov.tipo === 'ENTRADA'
            ? 'Ingreso de Stock'
            : mov.tipo === 'SALIDA'
              ? 'Egreso de Stock'
              : 'Ajuste de Stock',
        subtitulo: mov.sucursalDestino
          ? mov.sucursalDestino.nombre
          : mov.sucursalOrigen
            ? mov.sucursalOrigen.nombre
            : 'Ajuste Interno',
        fecha: mov.fecha,
        descripcion: `Cantidad: ${mov.cantidad} ${lote.producto.unidadMedida}. Motivo: ${mov.motivo}. Operador: ${mov.usuario.nombre}.`,
        tipo: mov.tipo,
        icon: mov.tipo === 'ENTRADA' ? 'add_circle' : 'remove_circle',
        temperatura: null,
      });
    }

    // Evento 3: Transferencias
    for (const transDet of transferenciasDetalles) {
      const trans = transDet.transferencia;
      timelineEvents.push({
        id: `trans-${trans.id}`,
        titulo: 'Transferencia Inter-Sucursal',
        subtitulo: `De ${trans.origen.nombre} a ${trans.destino.nombre}`,
        fecha: trans.fechaEnvio,
        descripcion: `Código de Transferencia: ${trans.codigo}. Estado: ${trans.estado}. Cantidad transferida: ${transDet.cantidad} ${lote.producto.unidadMedida}. Despachado por: ${trans.creadoPor.nombre}.${trans.recibidoPor ? ' Recibido por: ' + trans.recibidoPor.nombre : ''}`,
        tipo: 'TRANSFERENCIA',
        icon: 'swap_horiz',
        temperatura: null,
      });
    }

    // Evento 4: Ventas a Clientes
    for (const vDet of ventasDetalles) {
      const venta = vDet.venta;
      timelineEvents.push({
        id: `venta-${venta.id}`,
        titulo: 'Venta Consumidor Final',
        subtitulo: `Sucursal: ${venta.sucursal.nombre}`,
        fecha: venta.fecha,
        descripcion: `Ticket N°: ${venta.ticketNumero}. Cantidad vendida: ${vDet.cantidad} ${lote.producto.unidadMedida}. Cajero: ${venta.cajero.nombre}. Método de Pago: ${venta.metodoPago}.`,
        tipo: 'VENTA',
        icon: 'shopping_cart',
        temperatura: null,
      });
    }

    // Ordenar la línea de tiempo cronológicamente
    timelineEvents.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    return {
      lote: {
        id: lote.id,
        numeroLote: lote.numeroLote,
        producto: lote.producto.descripcion,
        sku: lote.producto.sku,
        unidadMedida: lote.producto.unidadMedida,
        fechaProduccion: lote.fechaProduccion,
        fechaVencimiento: lote.fechaVencimiento,
        cantidadActual: lote.cantidadActual,
        cantidadInicial: lote.cantidadInicial,
        estado: lote.estado,
        proveedor: lote.proveedor.nombre,
      },
      timeline: timelineEvents,
    };
  }

  // --- CONTROL DE VENCIMIENTOS ---
  @Get('vencimientos/analisis')
  async obtenerAnalisisVencimientos() {
    const lotes = await this.prisma.lote.findMany({
      include: { producto: true },
      where: { cantidadActual: { gt: 0 } },
    });

    const hoy = new Date();
    const vencidos: any[] = [];
    const proximos: any[] = []; // Vencen en los proximos 15 dias
    const seguros: any[] = [];

    for (const lote of lotes) {
      const diasRestantes = Math.ceil(
        (lote.fechaVencimiento.getTime() - hoy.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const loteData = {
        id: lote.id,
        numeroLote: lote.numeroLote,
        producto: lote.producto.descripcion,
        sku: lote.producto.sku,
        cantidad: lote.cantidadActual,
        fechaVencimiento: lote.fechaVencimiento,
        diasRestantes,
        estado: lote.estado,
      };

      if (diasRestantes <= 0) {
        vencidos.push(loteData);
      } else if (diasRestantes <= 15) {
        proximos.push(loteData);
      } else {
        seguros.push(loteData);
      }
    }

    return {
      resumen: {
        totalVencidos: vencidos.length,
        totalProximos: proximos.length,
        totalSeguros: seguros.length,
      },
      vencidos,
      proximos,
    };
  }
}
