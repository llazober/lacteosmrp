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

@Controller('finanzas')
export class FinanzasController {
  constructor(private prisma: PrismaService) {}

  // --- TÉRMINOS DE PAGO ---
  @Get('terminos-pago')
  async listarTerminosPago() {
    return this.prisma.terminoPago.findMany({
      orderBy: { dias: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('terminos-pago')
  async crearTerminoPago(@Request() req: any, @Body() body: any) {
    const { nombre, dias } = body;
    if (!nombre || dias == null) {
      throw new BadRequestException('El nombre y los días de crédito son obligatorios.');
    }

    const exist = await this.prisma.terminoPago.findUnique({ where: { nombre } });
    if (exist) {
      throw new BadRequestException('Ya existe un término de pago con este nombre.');
    }

    const tp = await this.prisma.terminoPago.create({
      data: {
        nombre,
        dias: parseInt(dias),
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_TERMINO_PAGO',
        modulo: 'FINANZAS',
        detalles: JSON.stringify(tp),
      },
    });

    return tp;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('terminos-pago/:id')
  async actualizarTerminoPago(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { nombre, dias, estado } = body;

    const tp = await this.prisma.terminoPago.update({
      where: { id },
      data: {
        nombre,
        dias: dias != null ? parseInt(dias) : undefined,
        estado,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_TERMINO_PAGO',
        modulo: 'FINANZAS',
        detalles: JSON.stringify(tp),
      },
    });

    return tp;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('terminos-pago/:id')
  async eliminarTerminoPago(@Param('id') id: string, @Request() req: any) {
    const count = await this.prisma.proveedor.count({ where: { terminoPagoId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'No se puede eliminar el término de pago porque hay proveedores asociados a él.',
      );
    }

    const tp = await this.prisma.terminoPago.delete({ where: { id } });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_TERMINO_PAGO',
        modulo: 'FINANZAS',
        detalles: JSON.stringify(tp),
      },
    });

    return { success: true, message: 'Término de pago eliminado con éxito.' };
  }

  // --- FACTURAS DE COMPRA (Cuentas por Pagar) ---
  @Get('facturas')
  async listarFacturas(@Request() req: any) {
    const isHQ = req.user.rol === 'ADMINISTRADOR' || req.user.rol === 'SUPERVISOR';
    const filter: any = {};

    if (!isHQ) {
      // Filtrar por sucursal si está ligada a una OC
      filter.ordenCompra = { sucursalId: req.user.sucursalId };
    }

    return this.prisma.facturaCompra.findMany({
      where: filter,
      include: {
        proveedor: true,
        ordenCompra: true,
        pagos: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: { fechaEmision: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('facturas')
  async crearFactura(@Request() req: any, @Body() body: any) {
    const {
      numeroFactura,
      proveedorId,
      ordenCompraId,
      fechaEmision,
      subtotal,
      iva,
      total,
      observaciones,
      detalles,
    } = body;

    if (
      !numeroFactura ||
      !proveedorId ||
      !fechaEmision ||
      total == null ||
      !detalles ||
      detalles.length === 0
    ) {
      throw new BadRequestException(
        'Los campos número de factura, proveedor, fecha de emisión, total y detalles son obligatorios.',
      );
    }

    // Buscar proveedor y su término de pago
    const proveedor = await this.prisma.proveedor.findUnique({
      where: { id: proveedorId },
      include: { terminoPago: true },
    });

    if (!proveedor) {
      throw new BadRequestException('El proveedor no existe.');
    }

    // Calcular fecha de vencimiento
    const emision = new Date(fechaEmision);
    const diasCredito = proveedor.terminoPago?.dias || 0;
    const vencimiento = new Date(emision.getTime() + diasCredito * 24 * 60 * 60 * 1000);

    const factura = await this.prisma.$transaction(async (tx) => {
      // Verificar unicidad
      const exist = await tx.facturaCompra.findUnique({
        where: {
          proveedorId_numeroFactura: {
            proveedorId,
            numeroFactura,
          },
        },
      });
      if (exist) {
        throw new BadRequestException(
          'Ya existe una factura registrada con ese número para este proveedor.',
        );
      }

      const fact = await tx.facturaCompra.create({
        data: {
          numeroFactura,
          proveedorId,
          ordenCompraId: ordenCompraId || null,
          fechaEmision: emision,
          fechaVencimiento: vencimiento,
          subtotal: parseFloat(subtotal || total),
          iva: parseFloat(iva || 0),
          total: parseFloat(total),
          estado: 'PENDIENTE',
          observaciones: observaciones || null,
          detalles: {
            create: detalles.map((d: any) => ({
              productoId: d.productoId,
              cantidad: parseFloat(d.cantidad),
              costoUnitario: parseFloat(d.costoUnitario),
              subtotal: parseFloat(d.cantidad) * parseFloat(d.costoUnitario),
            })),
          },
        },
        include: {
          detalles: true,
        },
      });

      return fact;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'REGISTRAR_FACTURA_COMPRA',
        modulo: 'FINANZAS',
        detalles: JSON.stringify(factura),
      },
    });

    return factura;
  }

  // --- REGISTRO DE PAGOS A FACTURAS ---
  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CAJERO')
  @Post('pagos')
  async registrarPago(@Request() req: any, @Body() body: any) {
    const {
      facturaCompraId,
      monto,
      fechaPago,
      metodoPago,
      referencia,
      cajaId,
      chequeNumero,
      chequeBanco,
      chequeVence,
    } = body;

    if (!facturaCompraId || monto == null || !metodoPago) {
      throw new BadRequestException(
        'Los campos facturaCompraId, monto y metodoPago son obligatorios.',
      );
    }

    const factura = await this.prisma.facturaCompra.findUnique({
      where: { id: facturaCompraId },
      include: { pagos: true, proveedor: true },
    });

    if (!factura) {
      throw new BadRequestException('La factura de compra no existe.');
    }

    if (factura.estado === 'PAGADA') {
      throw new BadRequestException('La factura ya se encuentra totalmente pagada.');
    }

    const pagadoAnterior = factura.pagos.reduce((sum, p) => sum + p.monto, 0);
    const saldoPendiente = factura.total - pagadoAnterior;

    const montoFloat = parseFloat(monto);
    if (montoFloat <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a cero.');
    }

    // Tolerancia decimal pequeña para evitar problemas de float de JS
    if (montoFloat > saldoPendiente + 0.01) {
      throw new BadRequestException(
        `El monto ingresado ($${montoFloat}) excede el saldo pendiente ($${saldoPendiente}).`,
      );
    }

    // Capturar datos bancarios si es transferencia/depósito para auditoría
    let transfeCuenta: string | null = null;
    if (metodoPago === 'TRANSFERENCIA' || metodoPago === 'DEPOSITO') {
      transfeCuenta = factura.proveedor.bancoNroCuenta
        ? `${factura.proveedor.bancoNombre} - N° ${factura.proveedor.bancoNroCuenta}`
        : 'Sin datos de cuenta';
    }

    const pago = await this.prisma.$transaction(async (tx) => {
      const p = await tx.pagoCompra.create({
        data: {
          facturaCompraId,
          monto: montoFloat,
          fechaPago: fechaPago ? new Date(fechaPago) : new Date(),
          metodoPago,
          referencia: referencia || null,
          cajaId: cajaId || null,
          usuarioId: req.user.id,
          chequeNumero: metodoPago === 'CHEQUE' ? chequeNumero || null : null,
          chequeBanco: metodoPago === 'CHEQUE' ? chequeBanco || null : null,
          chequeVence:
            metodoPago === 'CHEQUE' && chequeVence ? new Date(chequeVence) : null,
          transfeCuenta,
        },
      });

      const nuevoTotalPagado = pagadoAnterior + montoFloat;
      const nuevoEstado =
        nuevoTotalPagado >= factura.total - 0.05 ? 'PAGADA' : 'PAGADA_PARCIAL';

      await tx.facturaCompra.update({
        where: { id: facturaCompraId },
        data: { estado: nuevoEstado },
      });

      return p;
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'REGISTRAR_PAGO_COMPRA',
        modulo: 'FINANZAS',
        detalles: JSON.stringify(pago),
      },
    });

    return pago;
  }
}
