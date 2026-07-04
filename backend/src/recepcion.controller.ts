import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { Roles } from './decorators';

@Controller('recepciones')
export class RecepcionController {
  private readonly logger = new Logger(RecepcionController.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Get('ordenes-pendientes')
  async obtenerOrdenesPendientes(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {
      estado: { in: ['APROBADA', 'PARCIAL'] },
    };
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

  @Get()
  async obtenerRecepciones(@Request() req: any, @Query('search') search?: string) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }

    if (search) {
      filter.OR = [
        { numeroRecibo: { contains: search } },
        { facturaNumero: { contains: search } },
        { packingSlip: { contains: search } },
        { ordenCompra: { numeroOrden: { contains: search } } },
        { proveedor: { nombre: { contains: search } } },
      ];
    }

    return this.prisma.recepcionMaterial.findMany({
      where: filter,
      include: {
        ordenCompra: true,
        proveedor: true,
        sucursal: true,
        recibidoPor: { select: { nombre: true } },
        facturaCompra: true,
        detalles: {
          include: {
            producto: true,
            lote: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post()
  async crearRecepcion(@Request() req: any, @Body() body: any) {
    const {
      ordenCompraId,
      proveedorId,
      sucursalId,
      facturaNumero,
      packingSlip,
      observaciones,
      items, // array of: { productoId, cantidad, costoUnitario, numeroLote, fechaProduccion, fechaVencimiento, tempMin, tempMax }
    } = body;

    if (!sucursalId) {
      throw new BadRequestException('La sucursal de destino es obligatoria.');
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('La lista de ítems a recibir no puede estar vacía.');
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Obtener/Crear el Proveedor Genérico si se requiere fallback
      let fallbackProvId: string | null = null;
      const genericProv = await tx.proveedor.findUnique({
        where: { codigo: 'PROV-GENERICO' },
      });
      if (genericProv) {
        fallbackProvId = genericProv.id;
      } else {
        const newGeneric = await tx.proveedor.create({
          data: {
            codigo: 'PROV-GENERICO',
            nombre: 'Proveedor Genérico / Consumo Interno',
            contacto: 'N/A',
            telefono: '000000',
            correo: 'generico@lacteos.com',
            estado: 'ACTIVO',
          },
        });
        fallbackProvId = newGeneric.id;
      }

      // 2. Determinar número de recibo
      const count = await tx.recepcionMaterial.count();
      const numeroRecibo = `REC-${String(count + 1).padStart(5, '0')}`;

      // 3. Si hay ordenCompraId, cargarla para validaciones
      let oc: any = null;
      if (ordenCompraId) {
        oc = await tx.ordenCompra.findUnique({
          where: { id: ordenCompraId },
          include: { detalles: true },
        });
        if (!oc || (oc.estado !== 'APROBADA' && oc.estado !== 'PARCIAL')) {
          throw new BadRequestException(
            'La orden de compra no existe o no se encuentra en un estado válido para recibir mercadería (APROBADA o PARCIAL).',
          );
        }
      }

      // 4. Crear cabecera de la Recepción de Material
      const recepcion = await tx.recepcionMaterial.create({
        data: {
          numeroRecibo,
          ordenCompraId: ordenCompraId || null,
          proveedorId: proveedorId || (oc ? oc.proveedorId : null),
          sucursalId,
          recibidoPorId: req.user.id,
          facturaNumero: facturaNumero || null,
          packingSlip: packingSlip || null,
          observaciones: observaciones || null,
        },
      });

      // 5. Procesar cada ítem
      for (const item of items) {
        const cantidad = parseFloat(item.cantidad);
        if (cantidad <= 0) continue;

        const prodDb = await tx.producto.findUnique({
          where: { id: item.productoId },
        });
        if (!prodDb) {
          throw new BadRequestException(`El producto con ID ${item.productoId} no existe.`);
        }

        // Validación de entero para unidades
        if (prodDb.unidadMedida.toUpperCase() === 'UNIDAD' && cantidad % 1 !== 0) {
          throw new BadRequestException(
            `Para el producto "${prodDb.descripcion}" (Unidades), la cantidad recibida debe ser un número entero.`,
          );
        }



        // Si viene de una OC, actualizar cantidad recibida en el detalle
        let detalleOC: any = null;
        if (oc) {
          if (item.ordenCompraDetalleId) {
            detalleOC = oc.detalles.find((d: any) => d.id === item.ordenCompraDetalleId);
          } else {
            detalleOC = oc.detalles.find((d: any) => d.productoId === item.productoId);
          }

          if (detalleOC) {
            await tx.ordenCompraDetalle.update({
              where: { id: detalleOC.id },
              data: {
                cantidadRecibida: { increment: cantidad },
              },
            });
          }
        }

        // Clasificar Producto (Materia Prima/Insumo vs MNA)
        // MP/Insumo requiere creación de lote
        const esMateriaPrima =
          prodDb.tipoProducto === 'MATERIA_PRIMA' ||
          prodDb.tipoProducto === 'INSUMO' ||
          prodDb.tipoProducto === 'MP';

        let loteId: string | null = null;
        if (esMateriaPrima) {
          if (!item.numeroLote) {
            throw new BadRequestException(
              `El producto "${prodDb.descripcion}" es de tipo Materia Prima/Insumo y requiere ingresar número de lote.`,
            );
          }

          // Validar lote único
          const existLote = await tx.lote.findUnique({
            where: { numeroLote: item.numeroLote },
          });
          if (existLote) {
            throw new BadRequestException(
              `El número de lote "${item.numeroLote}" ya existe en el sistema.`,
            );
          }

          // Crear lote
          const provId = proveedorId || (oc ? oc.proveedorId : null) || fallbackProvId;
          const nuevoLote = await tx.lote.create({
            data: {
              numeroLote: item.numeroLote,
              productoId: item.productoId,
              fechaProduccion: item.fechaProduccion ? new Date(item.fechaProduccion) : new Date(),
              fechaVencimiento: item.fechaVencimiento
                ? new Date(item.fechaVencimiento)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
              proveedorId: provId,
              temperaturaRequeridaMin: parseFloat(item.tempMin || 2.0),
              temperaturaRequeridaMax: parseFloat(item.tempMax || 6.0),
              cantidadInicial: cantidad,
              cantidadActual: cantidad,
              estado: (prodDb.tipoProducto === 'MATERIA_PRIMA' || prodDb.tipoProducto === 'MP') ? 'PENDIENTE' : 'APROBADO',
            },
          });
          loteId = nuevoLote.id;
        }

        // Buscar Bodega destino
        const targetBodega = await this.obtenerBodegaParaProducto(sucursalId, item.productoId, tx);
        if (!targetBodega) {
          throw new BadRequestException(`No se encontró bodega para almacenar el producto "${prodDb.descripcion}".`);
        }

        // Si la bodega es de tipo leche entera fluida (o es la bodega de leche)
        const esBodegaLeche = targetBodega.tipoBodega === 'LECHE_ENTERA_FLUIDA' || 
                              targetBodega.tipoBodega === 'LECHE_ENTERA' ||
                              targetBodega.nombre.toLowerCase().includes('leche entera') ||
                              targetBodega.codigo.toLowerCase().includes('leche');

        if (esBodegaLeche) {
          // Obtener bins de la bodega
          const bins = await tx.bin.findMany({
            where: { bodegaId: targetBodega.id, estado: 'ACTIVO' },
          });
          const capMax = bins.reduce((sum: number, b: any) => sum + (b.capacidad || 0), 0) || 10000;

          // Obtener todos los productos asociados a esta bodega en Inventario
          const invs = await tx.inventario.findMany({
            where: { bodegaId: targetBodega.id },
            select: { productoId: true },
          });
          const productIds = Array.from(new Set([item.productoId, ...invs.map((i: any) => i.productoId)]));

          const activeLotes = await tx.lote.findMany({
            where: {
              productoId: { in: productIds },
              cantidadActual: { gt: 0 },
            },
          });
          const currentTotal = activeLotes.reduce((sum: number, l: any) => sum + l.cantidadActual, 0);
          if (currentTotal + cantidad > capMax) {
            throw new BadRequestException(
              `Capacidad de la bodega/tanque excedida. Capacidad máxima: ${capMax.toLocaleString()}L. Disponible: ${(capMax - currentTotal).toLocaleString()}L. Intento de recibir: ${cantidad.toLocaleString()}L.`,
            );
          }
        }

        // Upsert en Inventario targeting binId: null
        const existingInv = await tx.inventario.findFirst({
          where: {
            productoId: item.productoId,
            bodegaId: targetBodega.id,
            binId: null,
          },
        });
        if (existingInv) {
          await tx.inventario.update({
            where: { id: existingInv.id },
            data: { existencia: { increment: cantidad } },
          });
        } else {
          await tx.inventario.create({
            data: {
              productoId: item.productoId,
              sucursalId,
              bodegaId: targetBodega.id,
              binId: null,
              existencia: cantidad,
              existMin: 10,
              existMax: 500,
            },
          });
        }

        // Registrar movimiento
        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: item.productoId,
            loteId,
            sucursalDestinoId: sucursalId,
            bodegaDestinoId: targetBodega.id,
            cantidad,
            motivo: oc
              ? `Recepción de mercadería por OC ${oc.numeroOrden} (Recibo ${numeroRecibo})`
              : `Recepción de mercadería ad-hoc (Recibo ${numeroRecibo})`,
            usuarioId: req.user.id,
          },
        });

        // Crear detalle de RecepcionMaterial
        const costo = item.costoUnitario !== undefined
          ? parseFloat(item.costoUnitario)
          : (detalleOC ? detalleOC.costoUnitario : prodDb.costo);

        await tx.recepcionMaterialDetalle.create({
          data: {
            recepcionMaterialId: recepcion.id,
            productoId: item.productoId,
            cantidad,
            costoUnitario: costo !== undefined ? parseFloat(costo as any) : prodDb.costo,
            loteId,
          },
        });
      }

      // 6. Si hay OC, verificar si ya se completó
      if (oc) {
        const detallesActualizados = await tx.ordenCompraDetalle.findMany({
          where: { ordenCompraId: oc.id },
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
          where: { id: oc.id },
          data: { estado: nuevoEstado },
        });
      }

      return {
        id: recepcion.id,
        numeroRecibo: recepcion.numeroRecibo,
      };
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_RECEPCION_MATERIAL',
        modulo: 'COMPRAS',
        detalles: JSON.stringify({ id: resultado.id, numeroRecibo: resultado.numeroRecibo }),
      },
    });

    // Enviar notificación por correo a Contabilidad
    try {
      const fullRecepcion = await this.prisma.recepcionMaterial.findUnique({
        where: { id: resultado.id },
        include: {
          proveedor: true,
          sucursal: true,
          recibidoPor: { select: { nombre: true } },
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      if (fullRecepcion) {
        const configContabilidad = await this.prisma.configuracion.findUnique({
          where: { clave: 'email_departamento_contabilidad' },
        });

        const destinatario = configContabilidad?.valor;
        if (destinatario && destinatario.trim() !== '') {
          let totalRecepcion = 0;
          const itemsHtml = fullRecepcion.detalles.map((det) => {
            const subtotal = det.cantidad * Number(det.costoUnitario);
            totalRecepcion += subtotal;
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${det.producto.sku}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${det.producto.descripcion}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${det.cantidad} ${det.producto.unidadMedida}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${Number(det.costoUnitario).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${subtotal.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</td>
              </tr>
            `;
          }).join('');

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
              <h2 style="color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-top: 0;">Notificación de Recepción de Materiales</h2>
              <p>Estimado equipo de Contabilidad,</p>
              <p>Se ha registrado una nueva recepción de materiales en el sistema Lácteos ERP:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 140px; border-bottom: 1px solid #f3f4f6;">Número de Recibo:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.numeroRecibo}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Proveedor:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.proveedor?.nombre || 'Proveedor Genérico'} (${fullRecepcion.proveedor?.codigo || 'N/A'})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Factura/Guía:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.facturaNumero || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Packing Slip:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.packingSlip || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Sucursal Destino:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.sucursal?.nombre || 'General'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Recibido Por:</td>
                  <td style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">${fullRecepcion.recibidoPor?.nombre || 'Usuario ERP'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Fecha:</td>
                  <td style="padding: 6px 0;">${new Date(fullRecepcion.fecha).toLocaleString('es-CL')}</td>
                </tr>
              </table>

              <h3 style="color: #059669; margin-top: 25px;">Detalle de Productos Recibidos</h3>
              <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6; text-align: left;">
                    <th style="padding: 8px; border: 1px solid #ddd;">SKU</th>
                    <th style="padding: 8px; border: 1px solid #ddd;">Producto</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Cantidad</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Costo Unit.</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                  <tr style="font-weight: bold; background-color: #f9fafb;">
                    <td colspan="4" style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total Recepción:</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right; color: #059669;">$${totalRecepcion.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>

              ${fullRecepcion.observaciones ? `
                <div style="margin-top: 20px; padding: 10px; background-color: #fef3c7; border-left: 4px solid #d97706; border-radius: 4px; font-size: 14px;">
                  <strong>Observaciones:</strong> ${fullRecepcion.observaciones}
                </div>
              ` : ''}

              <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px; margin-bottom: 10px;" />
              <p style="font-size: 11px; color: #9ca3af; text-align: center;">Este es un mensaje generado automáticamente por Lácteos ERP.</p>
            </div>
          `;

          this.emailService.enviarCorreo(
            destinatario,
            `[ERP Recepción] Nuevo Recibo de Materiales ${fullRecepcion.numeroRecibo}`,
            emailHtml
          ).catch((err) => {
            this.logger.error(`Error al enviar correo de recepción a Contabilidad: ${err.message}`);
          });
        }
      }
    } catch (emailErr: any) {
      this.logger.error(`Error al despachar notificación a Contabilidad: ${emailErr.message}`);
    }

    return {
      success: true,
      message: 'Recepción registrada y existencias actualizadas exitosamente.',
      data: resultado,
    };
  }

  private async obtenerBodegaParaProducto(sucursalId: string, productoId: string, tx?: any) {
    const client = tx || this.prisma;

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
