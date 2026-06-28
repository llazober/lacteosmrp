import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('recepciones')
export class RecepcionController {
  constructor(private prisma: PrismaService) {}

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
              estado: prodDb.sku === 'MP-LECHE-CRUDA' ? 'PENDIENTE' : 'APROBADO',
            },
          });
          loteId = nuevoLote.id;
        }

        // Buscar Bodega destino
        const targetBodega = await this.obtenerBodegaParaProducto(sucursalId, item.productoId, tx);
        if (!targetBodega) {
          throw new BadRequestException(`No se encontró bodega para almacenar el producto "${prodDb.descripcion}".`);
        }

        // Upsert en Inventario
        await tx.inventario.upsert({
          where: {
            productoId_bodegaId: {
              productoId: item.productoId,
              bodegaId: targetBodega.id,
            },
          },
          update: { existencia: { increment: cantidad } },
          create: {
            productoId: item.productoId,
            sucursalId,
            bodegaId: targetBodega.id,
            existencia: cantidad,
            existMin: 10,
            existMax: 500,
          },
        });

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
