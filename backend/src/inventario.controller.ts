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
  async obtenerEstadoTanqueLeche(
    @Query('tipo') tipo?: string,
    @Query('binId') binId?: string,
  ) {
    const targetTipo = tipo || 'LECHE_ENTERA';

    // 1. Encontrar la bodega correspondiente
    const bodegaLeche = await this.prisma.bodega.findFirst({
      where: {
        OR: [
          { tipoBodega: targetTipo },
          { nombre: { contains: targetTipo === 'LECHE_DESCREMADA' ? 'Descremada' : 'Leche Entera' } },
        ],
      },
      include: {
        bins: {
          where: { estado: 'ACTIVO' },
          orderBy: { codigo: 'asc' },
        },
      },
    });

    const bins = bodegaLeche?.bins || [];

    // Determinar el bin seleccionado (por defecto el primero si no se especifica)
    const selectedBinId = binId || (bins.length > 0 ? bins[0].id : null);
    const selectedBin = bins.find((b) => b.id === selectedBinId);

    // Capacidad del silo/tanque seleccionado
    const capacidadMax = selectedBin ? (selectedBin.capacidad || 10000) : 10000;

    // 3. Encontrar los productos asociados a esta bodega en este bin específico en Inventario
    const invs = bodegaLeche
      ? await this.prisma.inventario.findMany({
          where: {
            bodegaId: bodegaLeche.id,
            binId: selectedBinId,
          },
          select: {
            productoId: true,
          },
        })
      : [];

    const productIds = Array.from(new Set(invs.map((i) => i.productoId)));

    // Fallback por si no hay inventario asignado aún
    if (productIds.length === 0) {
      const fallbackSku = targetTipo === 'LECHE_DESCREMADA' ? 'MP-LECHE-DESCREMADA' : 'MP-LECHE-CRUDA';
      const fallbackProd = await this.prisma.producto.findFirst({
        where: {
          OR: [
            { sku: fallbackSku },
            { descripcion: { contains: targetTipo === 'LECHE_DESCREMADA' ? 'Descremada' : 'Leche Cruda' } },
          ],
        },
      });
      if (fallbackProd) {
        productIds.push(fallbackProd.id);
      }
    }

    const lotes = await this.prisma.lote.findMany({
      where: {
        productoId: { in: productIds },
        cantidadActual: { gt: 0 },
        binId: selectedBinId,
      },
      orderBy: { createdAt: 'asc' },
    });

    const coloresPaleta = [
      '#10B981', '#F59E0B', '#3B82F6', '#EC4899',
      '#8B5CF6', '#EF4444', '#06B6D4', '#14B8A6',
    ];

    const lotesConColor = lotes.map((l, index) => ({
      ...l,
      color: coloresPaleta[index % coloresPaleta.length],
    }));

    const totalLitros = lotes.reduce((sum, l) => sum + l.cantidadActual, 0);

    // 4. Obtener historial de mezclas para trazabilidad de este bin
    const mezclas = await this.prisma.mezclaLeche.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      where: selectedBinId
        ? {
            componentes: {
              some: {
                loteOrigen: {
                  binId: selectedBinId,
                },
              },
            },
          }
        : undefined,
      include: {
        loteMixto: true,
        ordenProduccion: {
          include: { receta: true },
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
      activeBinId: selectedBinId,
      bodegaId: bodegaLeche?.id,
      bodegaNombre: bodegaLeche?.nombre,
      sucursalId: bodegaLeche?.sucursalId,
      bins: bins.map((b) => ({
        id: b.id,
        codigo: b.codigo,
        nombre: b.nombre,
        capacidad: b.capacidad || 10000,
        unidad: b.unidad || 'Lts',
      })),
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

    const exist = await this.prisma.inventario.findFirst({
      where: {
        productoId,
        bodegaId: targetBodegaId,
        binId: binId || null,
      },
    });
    if (exist) {
      throw new BadRequestException(
        'Este producto ya está registrado en la bodega y bin seleccionados.',
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

    if (existMin != null || existMax != null) {
      await this.prisma.producto.update({
        where: { id: productoId },
        data: {
          stockMin: existMin != null ? parseFloat(existMin) : undefined,
          stockMax: existMax != null ? parseFloat(existMax) : undefined,
        },
      });
    }

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

    if (binId !== undefined) {
      const targetBinId = binId || null;
      if (targetBinId !== prev.binId) {
        const exist = await this.prisma.inventario.findFirst({
          where: {
            productoId: prev.productoId,
            bodegaId: prev.bodegaId,
            binId: targetBinId,
            NOT: { id },
          },
        });
        if (exist) {
          throw new BadRequestException(
            'Ya existe un registro para este producto en el bin seleccionado.',
          );
        }
      }
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

    if (existMin != null || existMax != null) {
      await this.prisma.producto.update({
        where: { id: prev.productoId },
        data: {
          stockMin: existMin != null ? parseFloat(existMin) : undefined,
          stockMax: existMax != null ? parseFloat(existMax) : undefined,
        },
      });
    }

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
    const { productoId, sucursalId, bodegaId, binId, loteId, cantidad, tipo, motivo } = body;

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

    // Ejecutar en transacción de Prisma
    const { movimiento, nuevoStock } = await this.prisma.$transaction(async (tx) => {
      const targetBinId = binId || null;
      const inv = await tx.inventario.findFirst({
        where: { productoId, bodegaId: targetBodegaId, binId: targetBinId },
      });

      const stockActual = inv ? inv.existencia : 0;
      let nuevoStock = stockActual;

      if (tipo === 'ENTRADA') {
        nuevoStock += cantNum;
      } else if (tipo === 'SALIDA') {
        if (stockActual < cantNum) {
          throw new BadRequestException(
            `Stock insuficiente en la ubicación seleccionada para realizar el egreso. Stock actual: ${stockActual}`,
          );
        }
        nuevoStock -= cantNum;
      } else {
        throw new BadRequestException(
          'Tipo de ajuste inválido. Debe ser ENTRADA o SALIDA.',
        );
      }

      const mov = await tx.movimientoInventario.create({
        data: {
          tipo,
          productoId,
          loteId: loteId || null,
          sucursalOrigenId: tipo === 'SALIDA' ? sucursalId : null,
          sucursalDestinoId: tipo === 'ENTRADA' ? sucursalId : null,
          bodegaOrigenId: tipo === 'SALIDA' ? targetBodegaId : null,
          bodegaDestinoId: tipo === 'ENTRADA' ? targetBodegaId : null,
          cantidad: cantNum,
          motivo: targetBinId 
            ? `${motivo} (Ajuste en Bin: ${targetBinId})` 
            : motivo,
          usuarioId: req.user.id,
        },
        include: { producto: true },
      });

      if (inv) {
        await tx.inventario.update({
          where: { id: inv.id },
          data: { existencia: nuevoStock },
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId,
            sucursalId,
            bodegaId: targetBodegaId,
            binId: targetBinId,
            existencia: nuevoStock,
            existMin: 10,
            existMax: 100,
          },
        });
      }

      if (loteId) {
        await tx.lote.update({
          where: { id: loteId },
          data: {
            cantidadActual: {
              [tipo === 'ENTRADA' ? 'increment' : 'decrement']: cantNum,
            },
          },
        });
      }

      return { movimiento: mov, nuevoStock };
    });

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

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'ALMACEN')
  @Post('mover-bin')
  async moverBin(@Request() req: any, @Body() body: any) {
    const { productoId, sucursalId, bodegaId, binOrigenId, binDestinoId, loteId, cantidad } = body;

    if (!productoId || !sucursalId || !bodegaId || cantidad == null) {
      throw new BadRequestException(
        'Producto, Sucursal, Bodega y Cantidad son requeridos para mover stock.',
      );
    }

    const cantNum = parseFloat(cantidad);
    if (cantNum <= 0) {
      throw new BadRequestException('La cantidad a mover debe ser mayor que cero.');
    }

    const sourceBinId = binOrigenId || null;
    const destBinId = binDestinoId || null;

    if (sourceBinId === destBinId) {
      throw new BadRequestException('El bin de origen y destino deben ser diferentes.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar inventario origen
      const invOrigen = await tx.inventario.findFirst({
        where: { productoId, sucursalId, bodegaId, binId: sourceBinId },
      });

      if (!invOrigen || invOrigen.existencia < cantNum) {
        throw new BadRequestException(
          `Stock insuficiente en el bin de origen. Stock disponible: ${invOrigen ? invOrigen.existencia : 0}`,
        );
      }

      // 2. Decrementar origen
      const newOrigenStock = invOrigen.existencia - cantNum;
      await tx.inventario.update({
        where: { id: invOrigen.id },
        data: { existencia: newOrigenStock },
      });

      // 3. Incrementar/Crear destino
      const invDestino = await tx.inventario.findFirst({
        where: { productoId, sucursalId, bodegaId, binId: destBinId },
      });

      if (invDestino) {
        await tx.inventario.update({
          where: { id: invDestino.id },
          data: { existencia: invDestino.existencia + cantNum },
        });
      } else {
        await tx.inventario.create({
          data: {
            productoId,
            sucursalId,
            bodegaId,
            binId: destBinId,
            existencia: cantNum,
            existMin: invOrigen.existMin,
            existMax: invOrigen.existMax,
          },
        });
      }

      // Fetch product info to check type/name
      const prod = await tx.producto.findUnique({ where: { id: productoId } });
      if (!prod) {
        throw new BadRequestException('El producto especificado no existe.');
      }

      const bodega = await tx.bodega.findUnique({ where: { id: bodegaId } });
      const esBodegaLeche = bodega ? (
        bodega.tipoBodega === 'LECHE_ENTERA_FLUIDA' || 
        bodega.tipoBodega === 'LECHE_ENTERA' ||
        bodega.tipoBodega === 'LECHE_DESCREMADA' ||
        bodega.nombre.toLowerCase().includes('leche entera') ||
        bodega.nombre.toLowerCase().includes('leche descremada') ||
        bodega.codigo.toLowerCase().includes('leche')
      ) : false;

      let resolvedLoteId = loteId;

      if (esBodegaLeche) {
        const activeLotes = await tx.lote.findMany({
          where: {
            productoId,
            cantidadActual: { gt: 0 },
            binId: sourceBinId,
          },
          orderBy: { fechaVencimiento: 'asc' },
        });

        if (activeLotes.length === 0) {
          throw new BadRequestException(
            'No hay lotes activos en el bin de origen para realizar el traslado.',
          );
        } else if (activeLotes.length === 1) {
          const singleLote = activeLotes[0];
          resolvedLoteId = singleLote.id;
          if (singleLote.cantidadActual < cantNum) {
            throw new BadRequestException(
              `La cantidad en el único lote disponible (${singleLote.cantidadActual}) es menor que la cantidad a mover (${cantNum}).`,
            );
          }

          if (Math.abs(singleLote.cantidadActual - cantNum) < 0.00001) {
            await tx.lote.update({
              where: { id: singleLote.id },
              data: { binId: destBinId },
            });
          } else {
            await tx.lote.update({
              where: { id: singleLote.id },
              data: { cantidadActual: singleLote.cantidadActual - cantNum },
            });

            const uniqueSuffix = `-S${Date.now().toString().slice(-4)}`;
            const nuevoLoteTraslado = await tx.lote.create({
              data: {
                numeroLote: `${singleLote.numeroLote}${uniqueSuffix}`,
                productoId: singleLote.productoId,
                fechaProduccion: singleLote.fechaProduccion,
                fechaVencimiento: singleLote.fechaVencimiento,
                proveedorId: singleLote.proveedorId,
                temperaturaRequeridaMin: singleLote.temperaturaRequeridaMin,
                temperaturaRequeridaMax: singleLote.temperaturaRequeridaMax,
                cantidadInicial: cantNum,
                cantidadActual: cantNum,
                estado: singleLote.estado,
                binId: destBinId,
              },
            });
            resolvedLoteId = nuevoLoteTraslado.id;
          }
        } else {
          // Multiple lotes: proportional deduction and parent transfer mix lote creation
          const totalDisponible = activeLotes.reduce((sum, l) => sum + l.cantidadActual, 0);
          if (totalDisponible < cantNum) {
            throw new BadRequestException(
              `El stock total de todos los lotes en el bin (${totalDisponible}) es menor que la cantidad a mover (${cantNum}).`,
            );
          }

          const fraction = cantNum / totalDisponible;
          for (const lote of activeLotes) {
            const aDescontar = lote.cantidadActual * fraction;
            const newCantidadActual = Math.max(0, lote.cantidadActual - aDescontar);
            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: newCantidadActual },
            });
          }

          const minVencimiento = new Date(Math.min(...activeLotes.map(l => l.fechaVencimiento.getTime())));
          let proveedorInterno = await tx.proveedor.findFirst({
            where: { codigo: 'INTERNO' },
          });
          if (!proveedorInterno) {
            proveedorInterno = await tx.proveedor.findFirst();
          }
          const proveedorId = proveedorInterno ? proveedorInterno.id : activeLotes[0].proveedorId;

          const nuevoLoteMixto = await tx.lote.create({
            data: {
              numeroLote: `L-MIX-TR-${prod.sku}-${Date.now()}`,
              productoId,
              fechaProduccion: new Date(),
              fechaVencimiento: minVencimiento,
              proveedorId: proveedorId,
              temperaturaRequeridaMin: prod.temperaturaMin || 2.0,
              temperaturaRequeridaMax: prod.temperaturaMax || 4.0,
              cantidadInicial: cantNum,
              cantidadActual: cantNum,
              estado: 'APROBADO',
              binId: destBinId,
            },
          });
          resolvedLoteId = nuevoLoteMixto.id;
        }
      } else {
        // Normal non-milk products: proceed with the normal loteId logic
        if (loteId) {
          const lote = await tx.lote.findUnique({ where: { id: loteId } });
          if (!lote) {
            throw new BadRequestException(`El lote especificado no existe.`);
          }
          if (lote.cantidadActual < cantNum) {
            throw new BadRequestException(
              `La cantidad en el lote (${lote.cantidadActual}) es menor que la cantidad a mover (${cantNum}).`,
            );
          }

          if (Math.abs(lote.cantidadActual - cantNum) < 0.00001) {
            // Mover lote completo
            await tx.lote.update({
              where: { id: lote.id },
              data: { binId: destBinId },
            });
          } else {
            // Dividir lote
            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: lote.cantidadActual - cantNum },
            });

            const uniqueSuffix = `-S${Date.now().toString().slice(-4)}`;
            const nuevoLote = await tx.lote.create({
              data: {
                numeroLote: `${lote.numeroLote}${uniqueSuffix}`,
                productoId: lote.productoId,
                fechaProduccion: lote.fechaProduccion,
                fechaVencimiento: lote.fechaVencimiento,
                proveedorId: lote.proveedorId,
                certificadoUrl: lote.certificadoUrl,
                temperaturaRequeridaMin: lote.temperaturaRequeridaMin,
                temperaturaRequeridaMax: lote.temperaturaRequeridaMax,
                cantidadInicial: cantNum,
                cantidadActual: cantNum,
                estado: lote.estado,
                binId: destBinId,
                ordenProduccionId: lote.ordenProduccionId,
              },
            });
            resolvedLoteId = nuevoLote.id;
          }
        }
      }

      // 4. Obtener datos para el movimiento
      const lote = resolvedLoteId ? await tx.lote.findUnique({ where: { id: resolvedLoteId } }) : null;
      const binOrigen = sourceBinId ? await tx.bin.findUnique({ where: { id: sourceBinId } }) : null;
      const binDestino = destBinId ? await tx.bin.findUnique({ where: { id: destBinId } }) : null;

      const descOrigen = binOrigen ? binOrigen.codigo : 'Defecto';
      const descDestino = binDestino ? binDestino.codigo : 'Defecto';

      // 5. Registrar movimientos de inventario para Kardex
      await tx.movimientoInventario.create({
        data: {
          tipo: 'SALIDA',
          productoId,
          loteId: resolvedLoteId || null,
          sucursalOrigenId: sucursalId,
          bodegaOrigenId: bodegaId,
          cantidad: cantNum,
          motivo: `Traslado interno: Egreso del bin ${descOrigen} hacia bin ${descDestino}${lote ? ` (Lote: ${lote.numeroLote})` : ''}`,
          usuarioId: req.user.id,
        },
      });

      await tx.movimientoInventario.create({
        data: {
          tipo: 'ENTRADA',
          productoId,
          loteId: resolvedLoteId || null,
          sucursalDestinoId: sucursalId,
          bodegaDestinoId: bodegaId,
          cantidad: cantNum,
          motivo: `Traslado interno: Ingreso al bin ${descDestino} desde bin ${descOrigen}${lote ? ` (Lote: ${lote.numeroLote})` : ''}`,
          usuarioId: req.user.id,
        },
      });

      return {
        message: 'Traslado de bin completado con éxito.',
        stockOrigen: newOrigenStock,
        stockDestino: (invDestino ? invDestino.existencia : 0) + cantNum,
      };
    });
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

    // Verificar existencias generales across all bins in this bodega
    const invs = await this.prisma.inventario.findMany({
      where: { productoId, bodegaId: targetBodegaId },
      include: { producto: true },
    });

    if (invs.length === 0) {
      throw new BadRequestException(
        'No se encontraron registros de inventario para este producto en la bodega seleccionada.',
      );
    }

    const existenciaTotal = invs.reduce((sum, i) => sum + i.existencia, 0);

    if (existenciaTotal < cantNum) {
      throw new BadRequestException(
        `Existencias insuficientes en inventario. Stock actual: ${existenciaTotal}`,
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

    const nuevoStockTotal = existenciaTotal - cantNum;

    // Ejecutar en transacción de Prisma
    const [movimiento] = await this.prisma.$transaction(async (tx) => {
      const mov = await tx.movimientoInventario.create({
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
      });

      let cantRestante = cantNum;
      // Deduct from bins starting with binId: null or largest existence
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

      if (loteId) {
        await tx.lote.update({
          where: { id: loteId },
          data: { cantidadActual: { decrement: cantNum } },
        });
      }

      return [mov];
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'REGISTRAR_MERMA',
        modulo: 'INVENTARIO',
        detalles: JSON.stringify({
          tipoMerma,
          sku: invs[0].producto.sku,
          cantidad: cantNum,
          sucursalId,
          bodegaId: targetBodegaId,
          nuevoStock: nuevoStockTotal,
          motivo,
        }),
      },
    });

    return {
      message: 'Merma registrada con éxito.',
      nuevoStock: nuevoStockTotal,
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

        // Verificar existencia en origen (across all bins in this bodega)
        const invsOrigen = await tx.inventario.findMany({
          where: {
            productoId: prod.productoId,
            bodegaId: defaultBodegaOrigen.id,
          },
        });

        const totalDisponible = invsOrigen.reduce((sum, i) => sum + i.existencia, 0);

        if (totalDisponible < parseFloat(prod.cantidad)) {
          throw new BadRequestException(
            `Stock insuficiente en sucursal de origen para el producto seleccionado. Disponible: ${totalDisponible}`,
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

          const invsOrigen = await tx.inventario.findMany({
            where: { productoId: det.productoId, bodegaId: bodOrigen.id },
          });

          let detCantidadRestante = det.cantidad;
          const sortedInvs = [...invsOrigen].sort((a, b) => {
            if (a.binId === null) return -1;
            if (b.binId === null) return 1;
            return b.existencia - a.existencia;
          });

          for (const inv of sortedInvs) {
            if (detCantidadRestante <= 0) break;
            const aDeducir = Math.min(inv.existencia, detCantidadRestante);
            await tx.inventario.update({
              where: { id: inv.id },
              data: { existencia: { decrement: aDeducir } },
            });
            detCantidadRestante -= aDeducir;
          }

          if (detCantidadRestante > 0 && sortedInvs.length > 0) {
            await tx.inventario.update({
              where: { id: sortedInvs[0].id },
              data: { existencia: { decrement: detCantidadRestante } },
            });
          }

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

            const invsOrigen = await tx.inventario.findMany({
              where: { productoId: det.productoId, bodegaId: bodOrigen.id },
            });

            let detCantidadRestante = det.cantidad;
            const sortedInvs = [...invsOrigen].sort((a, b) => {
              if (a.binId === null) return -1;
              if (b.binId === null) return 1;
              return b.existencia - a.existencia;
            });

            for (const inv of sortedInvs) {
              if (detCantidadRestante <= 0) break;
              const aDeducir = Math.min(inv.existencia, detCantidadRestante);
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDeducir } },
              });
              detCantidadRestante -= aDeducir;
            }

            if (detCantidadRestante > 0 && sortedInvs.length > 0) {
              await tx.inventario.update({
                where: { id: sortedInvs[0].id },
                data: { existencia: { decrement: detCantidadRestante } },
              });
            }

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

          // Aumentar existencia en destino targeting binId: null
          const existingInv = await tx.inventario.findFirst({
            where: {
              productoId: det.productoId,
              bodegaId: bodDestino.id,
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
                sucursalId: tr.destinoId,
                bodegaId: bodDestino.id,
                binId: null,
                existencia: det.cantidad,
                existMin: 5,
                existMax: 100,
              },
            });
          }

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

            const invsOrigen = await tx.inventario.findMany({
              where: { productoId: det.productoId, bodegaId: bodOrigen.id },
            });

            let detCantidadRestante = det.cantidad;
            const sortedInvs = [...invsOrigen].sort((a, b) => {
              if (a.binId === null) return -1;
              if (b.binId === null) return 1;
              return b.existencia - a.existencia;
            });

            for (const inv of sortedInvs) {
              if (detCantidadRestante <= 0) break;
              const aDeducir = Math.min(inv.existencia, detCantidadRestante);
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDeducir } },
              });
              detCantidadRestante -= aDeducir;
            }

            if (detCantidadRestante > 0 && sortedInvs.length > 0) {
              await tx.inventario.update({
                where: { id: sortedInvs[0].id },
                data: { existencia: { decrement: detCantidadRestante } },
              });
            }

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

          const existingInv = await tx.inventario.findFirst({
            where: {
              productoId: det.productoId,
              bodegaId: bodDestino.id,
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
                sucursalId: tr.destinoId,
                bodegaId: bodDestino.id,
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
    const bodegas = await this.prisma.bodega.findMany({
      where: filter,
      include: {
        sucursal: true,
        bins: {
          where: { estado: 'ACTIVO' },
          orderBy: { codigo: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    const lotesOccupancy = await this.prisma.lote.groupBy({
      by: ['binId'],
      where: {
        binId: { not: null },
        cantidadActual: { gt: 0 },
      },
      _sum: {
        cantidadActual: true,
      },
    });

    const occupancyMap = new Map<string, number>();
    for (const item of lotesOccupancy) {
      if (item.binId) {
        occupancyMap.set(item.binId, item._sum.cantidadActual || 0);
      }
    }

    return bodegas.map((bodega) => ({
      ...bodega,
      bins: bodega.bins.map((bin) => {
        const occupancy = occupancyMap.get(bin.id) || 0;
        return {
          ...bin,
          ocupacion: occupancy,
          disponible: Math.max(0, (bin.capacidad || 10000) - occupancy),
        };
      }),
    }));
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
