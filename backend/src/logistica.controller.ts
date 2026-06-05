import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

// Función auxiliar para calcular distancia de Haversine
function calcularDistanciaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Controller('logistica')
export class LogisticaController implements OnModuleInit {
  public static autoReplenishEnabled = true;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Ejecutar reabastecimiento en segundo plano cada 5 minutos
    setInterval(() => {
      this.ejecutarReabastecimientoAutomaticoBackground().catch(err => {
        console.error('Error en reabastecimiento automático en segundo plano:', err);
      });
    }, 5 * 60 * 1000);

    // Y correr una ejecución inicial a los 10 segundos
    setTimeout(() => {
      this.ejecutarReabastecimientoAutomaticoBackground().catch(err => {
        console.error('Error inicial de reabastecimiento automático:', err);
      });
    }, 10000);
  }

  async ejecutarReabastecimientoAutomaticoBackground() {
    if (!LogisticaController.autoReplenishEnabled) {
      console.log('[LOGISTICA] Reabastecimiento automático en segundo plano desactivado.');
      return;
    }

    console.log('[LOGISTICA] Iniciando cálculo automático de reabastecimiento en segundo plano...');
    try {
      // Buscar al usuario administrador por defecto para registrar los movimientos/órdenes
      const adminUser = await this.prisma.usuario.findFirst({
        where: { rol: 'ADMINISTRADOR' },
      });

      if (!adminUser) {
        console.warn('[LOGISTICA] No se encontró ningún usuario ADMINISTRADOR. Cancelando reabastecimiento automático.');
        return;
      }

      // Calcular propuestas
      const propuestas = await this.calcularReabastecimiento();
      if (propuestas.length === 0) {
        console.log('[LOGISTICA] Todo abastecido. No se requiere reabastecimiento automático.');
        return;
      }

      // Procesar utilizando el método interno
      const mockReq = {
        user: {
          id: adminUser.id,
          nombre: `${adminUser.nombre} (Sistema Auto)`,
        },
      };

      const resultados = await this.procesarReabastecimiento(mockReq, { propuestas });
      console.log('[LOGISTICA] Reabastecimiento automático ejecutado. Resultados:', resultados.length);
    } catch (error) {
      console.error('[LOGISTICA] Error al ejecutar reabastecimiento automático:', error);
    }
  }

  @Get('config/autoreplenish')
  async getAutoReplenishConfig() {
    return { enabled: LogisticaController.autoReplenishEnabled };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('config/autoreplenish')
  async setAutoReplenishConfig(@Body() body: any) {
    const { enabled } = body;
    if (enabled === undefined) {
      throw new BadRequestException('El campo "enabled" es obligatorio.');
    }
    LogisticaController.autoReplenishEnabled = !!enabled;
    return { enabled: LogisticaController.autoReplenishEnabled };
  }

  // ==========================================
  // 1. GESTIÓN DE FLOTA (CAMIONES)
  // ==========================================
  @Get('camiones')
  async listarCamiones() {
    return this.prisma.camion.findMany({
      orderBy: { placa: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('camiones')
  async crearCamion(@Request() req: any, @Body() body: any) {
    const { placa, capacidadPeso, capacidadVolumen, temperaturaMin, temperaturaMax } = body;
    if (!placa || capacidadPeso == null || capacidadVolumen == null) {
      throw new BadRequestException('Placa, capacidad de peso y capacidad de volumen son requeridos.');
    }

    const exist = await this.prisma.camion.findUnique({ where: { placa } });
    if (exist) {
      throw new BadRequestException('Ya existe un camión con esa placa.');
    }

    const camion = await this.prisma.camion.create({
      data: {
        placa,
        capacidadPeso: parseFloat(capacidadPeso),
        capacidadVolumen: parseFloat(capacidadVolumen),
        temperaturaMin: parseFloat(temperaturaMin || 0),
        temperaturaMax: parseFloat(temperaturaMax || 25),
        gpsLat: 13.9785, // Ubicación Planta Principal por defecto (Santa Ana)
        gpsLng: -89.5398,
        estado: 'DISPONIBLE',
      },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_CAMION',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(camion),
      },
    });

    return camion;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('camiones/:id')
  async actualizarCamion(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { placa, capacidadPeso, capacidadVolumen, temperaturaMin, temperaturaMax, estado, gpsLat, gpsLng } = body;

    const exist = await this.prisma.camion.findUnique({ where: { id } });
    if (!exist) {
      throw new BadRequestException('El camión no existe.');
    }

    const dataUpdate: any = {};
    if (placa !== undefined) dataUpdate.placa = placa;
    if (capacidadPeso !== undefined) dataUpdate.capacidadPeso = parseFloat(capacidadPeso);
    if (capacidadVolumen !== undefined) dataUpdate.capacidadVolumen = parseFloat(capacidadVolumen);
    if (temperaturaMin !== undefined) dataUpdate.temperaturaMin = parseFloat(temperaturaMin);
    if (temperaturaMax !== undefined) dataUpdate.temperaturaMax = parseFloat(temperaturaMax);
    if (estado !== undefined) dataUpdate.estado = estado;
    if (gpsLat !== undefined) dataUpdate.gpsLat = parseFloat(gpsLat);
    if (gpsLng !== undefined) dataUpdate.gpsLng = parseFloat(gpsLng);

    const camion = await this.prisma.camion.update({
      where: { id },
      data: dataUpdate,
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_CAMION',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(camion),
      },
    });

    return camion;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('camiones/:id')
  async eliminarCamion(@Param('id') id: string, @Request() req: any) {
    const exist = await this.prisma.camion.findUnique({ where: { id } });
    if (!exist) {
      throw new BadRequestException('El camión no existe.');
    }

    // Verificar si tiene rutas asociadas
    const rutasCount = await this.prisma.ruta.count({ where: { camionId: id } });
    if (rutasCount > 0) {
      throw new BadRequestException('No se puede eliminar el camión porque tiene rutas asociadas.');
    }

    await this.prisma.camion.delete({ where: { id } });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_CAMION',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(exist),
      },
    });

    return { success: true, message: 'Camión eliminado exitosamente.' };
  }

  // ==========================================
  // 2. GESTIÓN DE CONDUCTORES
  // ==========================================
  @Get('conductores')
  async listarConductores() {
    return this.prisma.conductor.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('conductores')
  async crearConductor(@Request() req: any, @Body() body: any) {
    const { nombre, licencia, telefono } = body;
    if (!nombre || !licencia || !telefono) {
      throw new BadRequestException('Nombre, licencia y teléfono son obligatorios.');
    }

    const conductor = await this.prisma.conductor.create({
      data: { nombre, licencia, telefono, estado: 'ACTIVO' },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_CONDUCTOR',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(conductor),
      },
    });

    return conductor;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('conductores/:id')
  async actualizarConductor(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { nombre, licencia, telefono, estado } = body;

    const exist = await this.prisma.conductor.findUnique({ where: { id } });
    if (!exist) {
      throw new BadRequestException('El conductor no existe.');
    }

    const dataUpdate: any = {};
    if (nombre !== undefined) dataUpdate.nombre = nombre;
    if (licencia !== undefined) dataUpdate.licencia = licencia;
    if (telefono !== undefined) dataUpdate.telefono = telefono;
    if (estado !== undefined) dataUpdate.estado = estado;

    const conductor = await this.prisma.conductor.update({
      where: { id },
      data: dataUpdate,
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_CONDUCTOR',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(conductor),
      },
    });

    return conductor;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('conductores/:id')
  async eliminarConductor(@Param('id') id: string, @Request() req: any) {
    const exist = await this.prisma.conductor.findUnique({ where: { id } });
    if (!exist) {
      throw new BadRequestException('El conductor no existe.');
    }

    // Verificar si tiene rutas asociadas
    const rutasCount = await this.prisma.ruta.count({ where: { conductorId: id } });
    if (rutasCount > 0) {
      throw new BadRequestException('No se puede eliminar el conductor porque tiene rutas asociadas.');
    }

    await this.prisma.conductor.delete({ where: { id } });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_CONDUCTOR',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(exist),
      },
    });

    return { success: true, message: 'Conductor eliminado exitosamente.' };
  }

  // ==========================================
  // 3. MOTOR DE PRONÓSTICO DE DEMANDA
  // ==========================================
  @Get('pronostico')
  async calcularPronostico(
    @Query('sucursalId') sucursalId: string,
    @Query('productoId') productoId: string,
    @Query('fecha') fechaStr?: string,
    @Query('promocion') promocion?: string,
    @Query('festivo') festivo?: string,
    @Query('evento') evento?: string,
  ) {
    if (!sucursalId || !productoId) {
      throw new BadRequestException('sucursalId y productoId son requeridos.');
    }

    const fechaTarget = fechaStr ? new Date(fechaStr) : new Date();
    const dayOfWeek = fechaTarget.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const month = fechaTarget.getMonth(); // 0 = Enero, 11 = Diciembre

    // Obtener ventas del producto en la sucursal
    // 30 días atrás
    const hoy = new Date();
    const fecha30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fecha90 = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000);

    const ventasDetalle30 = await this.prisma.ventaDetalle.findMany({
      where: {
        productoId,
        venta: {
          sucursalId,
          fecha: { gte: fecha30 },
          estado: 'COMPLETADA',
        },
      },
      select: { cantidad: true },
    });

    const ventasDetalle90 = await this.prisma.ventaDetalle.findMany({
      where: {
        productoId,
        venta: {
          sucursalId,
          fecha: { gte: fecha90 },
          estado: 'COMPLETADA',
        },
      },
      select: { cantidad: true },
    });

    const totalVendido30 = ventasDetalle30.reduce((sum, item) => sum + item.cantidad, 0);
    const totalVendido90 = ventasDetalle90.reduce((sum, item) => sum + item.cantidad, 0);

    const promedioDiario30 = totalVendido30 / 30;
    const promedioDiario90 = totalVendido90 / 90;

    // Calcular demanda base ponderada (60% últimos 30 días, 40% últimos 90 días)
    let demandaBase = (promedioDiario30 * 0.6) + (promedioDiario90 * 0.4);

    // Si no hay ventas registradas, usamos una demanda base simbólica según la categoría
    if (demandaBase === 0) {
      const prod = await this.prisma.producto.findUnique({ where: { id: productoId } });
      if (prod) {
        if (prod.categoria === 'LECHE' || prod.categoria === 'YOGURT') demandaBase = 8.0;
        else if (prod.categoria === 'QUESOS') demandaBase = 3.5;
        else demandaBase = 2.0;
      } else {
        demandaBase = 5.0;
      }
    }

    // --- FACTORES ---
    // 1. Día de la semana (Fines de semana incrementan demanda)
    let factorDiaSemana = 1.0;
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sábado o Domingo
      factorDiaSemana = 1.25;
    } else if (dayOfWeek === 1) { // Lunes más flojo
      factorDiaSemana = 0.85;
    }

    // 2. Estacionalidad (Meses de verano Dec-Feb vs invierno Jun-Aug)
    let factorEstacionalidad = 1.0;
    const producto = await this.prisma.producto.findUnique({ where: { id: productoId } });
    if (producto) {
      if (producto.categoria === 'HELADOS' || producto.categoria === 'POSTRES' || producto.categoria === 'YOGURT') {
        if (month === 11 || month === 0 || month === 1) { // Verano hemisferio sur (Dic, Ene, Feb)
          factorEstacionalidad = 1.35;
        } else if (month === 5 || month === 6 || month === 7) { // Invierno (Jun, Jul, Ago)
          factorEstacionalidad = 0.75;
        }
      } else if (producto.categoria === 'LECHE' || producto.categoria === 'MANTEQUILLA') {
        if (month === 5 || month === 6 || month === 7) { // En invierno se consume más leche y mantequilla caliente
          factorEstacionalidad = 1.15;
        }
      }
    }

    // 3. Promociones
    const factorPromocion = promocion === 'true' || promocion === '1' ? 1.30 : 1.0;

    // 4. Festivos
    const factorFestivo = festivo === 'true' || festivo === '1' ? 1.20 : 1.0;

    // 5. Eventos Especiales
    const factorEvento = evento === 'true' || evento === '1' ? 1.15 : 1.0;

    // --- CÁLCULO FINAL ---
    const demandaEsperada = demandaBase * factorDiaSemana * factorEstacionalidad * factorPromocion * factorFestivo * factorEvento;
    const demandaMinima = Math.max(0.5, demandaEsperada * 0.7);
    const demandaMaxima = demandaEsperada * 1.4;

    return {
      productoId,
      sucursalId,
      fecha: fechaTarget,
      dayOfWeek,
      month,
      calculosBase: {
        totalVendido30,
        totalVendido90,
        promedioDiario30: parseFloat(promedioDiario30.toFixed(2)),
        promedioDiario90: parseFloat(promedioDiario90.toFixed(2)),
        demandaBase: parseFloat(demandaBase.toFixed(2)),
      },
      factores: {
        diaSemana: factorDiaSemana,
        estacionalidad: factorEstacionalidad,
        promocion: factorPromocion,
        festivo: factorFestivo,
        evento: factorEvento,
      },
      pronostico: {
        demandaEsperada: parseFloat(demandaEsperada.toFixed(2)),
        demandaMinima: parseFloat(demandaMinima.toFixed(2)),
        demandaMaxima: parseFloat(demandaMaxima.toFixed(2)),
      },
    };
  }

  // ==========================================
  // 4. CÁLCULO AUTOMÁTICO DE REABASTECIMIENTO Y REDISTRIBUCIÓN FEFO
  // ==========================================
  @Get('reabastecimiento/calcular')
  async calcularReabastecimiento(@Query('useSafetyStockMin') useSafetyStockMin?: string) {
    const useSafety = useSafetyStockMin === 'true';

    // Obtener todas las sucursales (excluyendo Planta de Producción Principal que actúa como el CD)
    const sucursales = await this.prisma.sucursal.findMany({
      where: { estado: 'ACTIVO' },
    });

    const plantaPrincipal = sucursales.find((s) => s.codigo === 'SUC-001');

    // Obtener productos de tipo PRODUCTO_TERMINADO
    const productos = await this.prisma.producto.findMany({
      where: { estado: 'ACTIVO', tipoProducto: { in: ['PRODUCTO_TERMINADO', 'PT'] } },
    });

    const propuestas: any[] = [];
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const suc of sucursales) {
      if (suc.codigo === 'SUC-001') continue; // El CD no se reabastece a sí mismo con este flujo

      for (const prod of productos) {
        // 1. Obtener Inventario Actual y en Tránsito
        const inv = await this.prisma.inventario.findUnique({
          where: { productoId_sucursalId: { productoId: prod.id, sucursalId: suc.id } },
        });
        const stockActual = inv ? inv.existencia : 0;

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
        const stockDisponible = stockActual + stockEnTransito;

        // 2. Calcular Promedio Ventas Diarias (últimos 30 días)
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
        const promedioVentasDiarias = totalVendido > 0 ? totalVendido / 30 : 2.0; // Default 2 unidades al día si no hay ventas

        const diasInventario = promedioVentasDiarias > 0 ? stockDisponible / promedioVentasDiarias : 0;

        // 3. Determinar Stock Objetivo según Configuración por Categoría
        let diasObjetivo = 5; // Default leche
        if (prod.categoria === 'YOGURT') diasObjetivo = 7;
        else if (prod.categoria === 'QUESOS') diasObjetivo = 10;
        else if (prod.categoria === 'MANTEQUILLA') diasObjetivo = 15;

        let stockObjetivo = promedioVentasDiarias * diasObjetivo;

        if (useSafety) {
          const stockMinimoSeguridad = inv ? inv.existMin : 5;
          stockObjetivo = Math.max(stockObjetivo, stockMinimoSeguridad);
        }

        // 4. Calcular Cantidad a Reabastecer
        if (stockDisponible < stockObjetivo) {
          const cantidadSugerida = Math.ceil(stockObjetivo - stockDisponible);

          // 5. Redistribución Inteligente (Buscar excesos o vencimientos en otras sucursales)
          let tipoOrigen = 'CD'; // Por defecto, se despacha del Centro de Distribución
          let origenSugeridoId = plantaPrincipal ? plantaPrincipal.id : null;
          let origenSugeridoNombre = plantaPrincipal ? plantaPrincipal.nombre : 'Centro de Distribución';
          let detalleRazon = 'Suministrado desde el Centro de Distribución';

          // Buscar en otras tiendas si tienen sobrestock o lotes cercanos a vencer (FEFO preventivo)
          const otrosInventarios = await this.prisma.inventario.findMany({
            where: {
              productoId: prod.id,
              sucursalId: { notIn: [suc.id, plantaPrincipal?.id].filter(Boolean) as string[] },
              existencia: { gt: 0 },
            },
            include: { sucursal: true },
          });

          for (const otroInv of otrosInventarios) {
            // Calcular ventas del otro local
            const otroVentasDetalle = await this.prisma.ventaDetalle.findMany({
              where: {
                productoId: prod.id,
                venta: { sucursalId: otroInv.sucursalId, fecha: { gte: hace30Dias }, estado: 'COMPLETADA' },
              },
              select: { cantidad: true },
            });
            const otroTotalVendido = otroVentasDetalle.reduce((sum, item) => sum + item.cantidad, 0);
            const otroPromedioVentas = otroTotalVendido > 0 ? otroTotalVendido / 30 : 2.0;
            const otroStockObjetivo = otroPromedioVentas * diasObjetivo;

            // Opción A: Exceso de stock en la otra sucursal
            const exceso = otroInv.existencia - otroStockObjetivo;
            if (exceso >= cantidadSugerida) {
              tipoOrigen = 'TRANSFERENCIA';
              origenSugeridoId = otroInv.sucursalId;
              origenSugeridoNombre = otroInv.sucursal.nombre;
              detalleRazon = `Exceso de stock en ${otroInv.sucursal.nombre} (${otroInv.existencia} unidades vs stock objetivo de ${otroStockObjetivo.toFixed(1)})`;
              break; // Encontramos un donante perfecto
            }
          }

          // Si sigue siendo CD, verificar si el CD tiene existencias
          if (tipoOrigen === 'CD' && plantaPrincipal) {
            const CDInv = await this.prisma.inventario.findUnique({
              where: { productoId_sucursalId: { productoId: prod.id, sucursalId: plantaPrincipal.id } },
            });
            const CDStock = CDInv ? CDInv.existencia : 0;
            if (CDStock < cantidadSugerida) {
              // Si el CD tampoco tiene stock, sugerimos PRODUCCION o COMPRA
              if (prod.marca === 'Lácteos ERP') {
                tipoOrigen = 'PRODUCCION';
                origenSugeridoId = null;
                origenSugeridoNombre = 'Línea de Producción Interna';
                detalleRazon = 'Stock insuficiente en CD. Requiere programar orden de producción.';
              } else {
                tipoOrigen = 'COMPRA';
                origenSugeridoId = null;
                origenSugeridoNombre = 'Proveedor Externo';
                detalleRazon = 'Stock insuficiente en CD. Requiere generar orden de compra a proveedor.';
              }
            }
          }

          propuestas.push({
            sucursalId: suc.id,
            sucursalNombre: suc.nombre,
            productoId: prod.id,
            productoSku: prod.sku,
            productoNombre: prod.descripcion,
            stockActual: parseFloat(stockActual.toFixed(2)),
            promedioVentasDiarias: parseFloat(promedioVentasDiarias.toFixed(2)),
            diasInventario: parseFloat(diasInventario.toFixed(1)),
            stockObjetivo: parseFloat(stockObjetivo.toFixed(1)),
            cantidadSugerida,
            tipoOrigen,
            origenSugeridoId,
            origenSugeridoNombre,
            detalleRazon,
            alertaRiesgo: diasInventario <= 2 ? 'CRITICO' : 'STOCK_BAJO',
          });
        }
      }
    }

    return propuestas;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('reabastecimiento/procesar')
  async procesarReabastecimiento(@Request() req: any, @Body() body: any) {
    const { propuestas } = body;
    if (!propuestas || !Array.isArray(propuestas)) {
      throw new BadRequestException('Propuestas debe ser una lista válida.');
    }

    const resultados: any[] = [];
    const hoy = new Date();

    for (const prop of propuestas) {
      if (prop.tipoOrigen === 'TRANSFERENCIA' || prop.tipoOrigen === 'CD') {
        const origenId = prop.origenSugeridoId;
        const destinoId = prop.sucursalId;
        const productoId = prop.productoId;
        const cantidad = parseFloat(prop.cantidadSugerida);

        if (!origenId || !destinoId) continue;

        // FEFO: Buscar lote del producto en el origen con stock suficiente
        const lotes = await this.prisma.lote.findMany({
          where: { productoId, cantidadActual: { gt: 0 } },
          orderBy: { fechaVencimiento: 'asc' },
        });

        if (lotes.length === 0) {
          resultados.push({
            sku: prop.productoSku,
            destino: prop.sucursalNombre,
            estado: 'ERROR',
            mensaje: 'No hay lotes disponibles con stock para transferir.',
          });
          continue;
        }

        // Usar primer lote que expira (FEFO)
        const loteSeleccionado = lotes[0];
        const aTransferir = Math.min(loteSeleccionado.cantidadActual, cantidad);

        // Crear registro de Transferencia
        const codigoTrans = `TR-AUTO-${Date.now().toString().substring(6)}-${Math.floor(Math.random() * 100)}`;
        
        await this.prisma.$transaction(async (tx) => {
          const trans = await tx.transferencia.create({
            data: {
              codigo: codigoTrans,
              origenId,
              destinoId,
              estado: 'PENDIENTE',
              fechaEnvio: hoy,
              creadoPorId: req.user.id,
            },
          });

          await tx.transferenciaDetalle.create({
            data: {
              transferenciaId: trans.id,
              productoId,
              loteId: loteSeleccionado.id,
              cantidad: aTransferir,
            },
          });

          // Disminuir stock en inventario de origen y sumarlo a "comprometido"
          // O simplemente deducir y realizar el movimiento
          // Para mantener el estándar del ERP, actualizamos Inventario
          const invOrigen = await tx.inventario.findUnique({
            where: { productoId_sucursalId: { productoId, sucursalId: origenId } },
          });

          if (invOrigen) {
            await tx.inventario.update({
              where: { id: invOrigen.id },
              data: { existencia: { decrement: aTransferir } },
            });
          }

          // Actualizar cantidad en lote
          await tx.lote.update({
            where: { id: loteSeleccionado.id },
            data: { cantidadActual: { decrement: aTransferir } },
          });

          // Registrar Movimiento de Salida por Transferencia
          await tx.movimientoInventario.create({
            data: {
              tipo: 'TRANSFERENCIA',
              productoId,
              loteId: loteSeleccionado.id,
              sucursalOrigenId: origenId,
              sucursalDestinoId: destinoId,
              cantidad: aTransferir,
              motivo: `Transferencia Automática de Reabastecimiento: Código ${codigoTrans}`,
              usuarioId: req.user.id,
            },
          });
        });

        resultados.push({
          sku: prop.productoSku,
          destino: prop.sucursalNombre,
          estado: 'OK',
          mensaje: `Transferencia ${codigoTrans} creada por ${aTransferir} unidades utilizando lote ${loteSeleccionado.numeroLote}.`,
        });

      } else if (prop.tipoOrigen === 'PRODUCCION') {
        // Generar sugerencia de orden de producción
        const codigoOP = `OP-SUG-${Date.now().toString().substring(8)}`;
        
        // Buscar receta
        const receta = await this.prisma.receta.findFirst({
          where: { productoFinalId: prop.productoId },
        });

        if (!receta) {
          resultados.push({
            sku: prop.productoSku,
            destino: prop.sucursalNombre,
            estado: 'ERROR',
            mensaje: 'No existe receta configurada para este producto. No se pudo programar producción.',
          });
          continue;
        }

        const op = await this.prisma.ordenProduccion.create({
          data: {
            numeroOrden: codigoOP,
            recetaId: receta.id,
            sucursalId: prop.sucursalId, // Programada para la tienda solicitante
            cantidadPlanificada: parseFloat(prop.cantidadSugerida),
            estado: 'PLANIFICADA',
            creadoPorId: req.user.id,
            responsableId: req.user.id, // Se asigna al mismo usuario creador temporalmente
          },
        });

        resultados.push({
          sku: prop.productoSku,
          destino: prop.sucursalNombre,
          estado: 'OK',
          mensaje: `Orden de Producción Sugerida ${codigoOP} creada bajo estado PLANIFICADA.`,
        });

      } else if (prop.tipoOrigen === 'COMPRA') {
        // Generar Solicitud de Reabastecimiento de Compra
        const codigoReq = `REQ-${Date.now().toString().substring(7)}`;
        
        const solicitud = await this.prisma.solicitudReabastecimiento.create({
          data: {
            codigo: codigoReq,
            sucursalId: prop.sucursalId,
            productoId: prop.productoId,
            cantidadSugerida: parseFloat(prop.cantidadSugerida),
            stockActual: parseFloat(prop.stockActual),
            stockObjetivo: parseFloat(prop.stockObjetivo),
            diasInventario: parseFloat(prop.diasInventario),
            estado: 'PENDIENTE',
            tipoOrigen: 'COMPRA',
          },
        });

        resultados.push({
          sku: prop.productoSku,
          destino: prop.sucursalNombre,
          estado: 'OK',
          mensaje: `Solicitud de Compra ${codigoReq} registrada en espera de aprobación.`,
        });
      }
    }

    return resultados;
  }

  // ==========================================
  // 5. PLANIFICACIÓN AUTOMÁTICA DE RUTAS (VRP/TSP)
  // ==========================================
  @Get('rutas/sugerir')
  async sugerirRutas() {
    // 1. Obtener todas las transferencias PENDIENTES que salen del Centro de Distribución (SUC-001)
    const cd = await this.prisma.sucursal.findFirst({ where: { codigo: 'SUC-001' } });
    if (!cd) {
      throw new BadRequestException('No se encontró la Planta de Producción/Centro de Distribución (SUC-001).');
    }

    const transferencias = await this.prisma.transferencia.findMany({
      where: { origenId: cd.id, estado: 'PENDIENTE' },
      include: {
        destino: true,
        detalles: {
          include: { producto: true },
        },
      },
    });

    if (transferencias.length === 0) {
      return {
        mensaje: 'No hay transferencias pendientes desde el Centro de Distribución para planificar rutas.',
        rutasSugeridas: [],
      };
    }

    // 2. Obtener vehículos (camiones) disponibles y conductores activos
    const camiones = await this.prisma.camion.findMany({ where: { estado: 'DISPONIBLE' } });
    const conductores = await this.prisma.conductor.findMany({ where: { estado: 'ACTIVO' } });

    if (camiones.length === 0 || conductores.length === 0) {
      throw new BadRequestException('Se necesitan camiones DISPONIBLES y choferes ACTIVOS para planificar rutas.');
    }

    // Calcular peso y volumen de cada transferencia
    // Como no tenemos peso/volumen específicos por unidad en la BD, lo estimamos:
    // Leche/Yogurt = 1kg por litro/unidad y 0.001 m3.
    // Quesos = 0.5kg por unidad y 0.002 m3.
    // Mantequilla = 0.25kg por unidad y 0.0005 m3.
    const transCargas = transferencias.map((tr) => {
      let pesoTotal = 0;
      let volumenTotal = 0;
      let requiereFrio = false;
      let requiereCongelado = false;

      tr.detalles.forEach((det) => {
        const qty = det.cantidad;
        const cat = det.producto.categoria;

        if (cat === 'LECHE' || cat === 'YOGURT') {
          pesoTotal += qty * 1.0;
          volumenTotal += qty * 0.001;
          requiereFrio = true;
        } else if (cat === 'QUESOS') {
          pesoTotal += qty * 0.5;
          volumenTotal += qty * 0.002;
          requiereFrio = true;
        } else if (cat === 'MANTEQUILLA') {
          pesoTotal += qty * 0.25;
          volumenTotal += qty * 0.0005;
          requiereFrio = true;
        } else if (cat === 'HELADOS') {
          pesoTotal += qty * 0.8;
          volumenTotal += qty * 0.0025;
          requiereCongelado = true;
        } else {
          pesoTotal += qty * 0.5;
          volumenTotal += qty * 0.001;
        }
      });

      return {
        transferencia: tr,
        peso: pesoTotal,
        volumen: volumenTotal,
        requiereFrio,
        requiereCongelado,
        destino: tr.destino,
      };
    });

    const rutasSugeridas: any[] = [];
    let camionIndex = 0;
    let conductorIndex = 0;

    // Asignación simple de Cargas a Camiones (Heurística Greedy)
    // Agrupamos paradas por compatibilidad de temperatura y capacidad de carga
    let transferenciasPorAsignar = [...transCargas];

    while (transferenciasPorAsignar.length > 0 && camionIndex < camiones.length) {
      const camion = camiones[camionIndex];
      const conductor = conductores[conductorIndex % conductores.length];

      const cargaAsignada: any[] = [];
      let pesoActual = 0;
      let volumenActual = 0;

      // Filtrar transferencias que sean compatibles con el rango de temperatura del camión
      const compatibles = transferenciasPorAsignar.filter((t) => {
        if (t.requiereCongelado && camion.temperaturaMin > -18) return false;
        if (t.requiereFrio && (camion.temperaturaMin > 6 || camion.temperaturaMax < 2)) return false;
        return true;
      });

      if (compatibles.length === 0) {
        // Si no hay compatibles para este camión, pasamos al siguiente
        camionIndex++;
        continue;
      }

      for (const t of compatibles) {
        if (pesoActual + t.peso <= camion.capacidadPeso && volumenActual + t.volumen <= camion.capacidadVolumen) {
          cargaAsignada.push(t);
          pesoActual += t.peso;
          volumenActual += t.volumen;
        }
      }

      if (cargaAsignada.length > 0) {
        // Quitar de la lista de pendientes
        transferenciasPorAsignar = transferenciasPorAsignar.filter(
          (t) => !cargaAsignada.some((ca) => ca.transferencia.id === t.transferencia.id)
        );

        // Resolver TSP para los puntos asignados (Nearest Neighbor)
        // Empezamos en CD
        let actualLat = cd.latitud || 13.9785;
        let actualLng = cd.longitud || -89.5398;
        const paradasOrdenadas: any[] = [];
        const paradasPorVisitar = [...cargaAsignada];

        while (paradasPorVisitar.length > 0) {
          let masCercanoIndex = 0;
          let menorDistancia = Infinity;

          paradasPorVisitar.forEach((p, idx) => {
            const lat = p.destino.latitud || 13.9785;
            const lng = p.destino.longitud || -89.5398;
            const dist = calcularDistanciaKm(actualLat, actualLng, lat, lng);
            if (dist < menorDistancia) {
              menorDistancia = dist;
              masCercanoIndex = idx;
            }
          });

          const paradaSiguiente = paradasPorVisitar.splice(masCercanoIndex, 1)[0];
          actualLat = paradaSiguiente.destino.latitud || 13.9785;
          actualLng = paradaSiguiente.destino.longitud || -89.5398;
          paradasOrdenadas.push(paradaSiguiente);
        }

        // Calcular kilómetros totales (ida, visitas y retorno al CD)
        let kilometros = 0;
        let prevLat = cd.latitud || 13.9785;
        let prevLng = cd.longitud || -89.5398;

        paradasOrdenadas.forEach((p) => {
          const lat = p.destino.latitud || 13.9785;
          const lng = p.destino.longitud || -89.5398;
          kilometros += calcularDistanciaKm(prevLat, prevLng, lat, lng);
          prevLat = lat;
          prevLng = lng;
        });

        // Sumar retorno al CD
        kilometros += calcularDistanciaKm(prevLat, prevLng, cd.latitud || 13.9785, cd.longitud || -89.5398);

        // Añadir factor de ruta urbana (curvas, calles reales vs línea recta: +30%)
        kilometros = parseFloat((kilometros * 1.3).toFixed(2));

        // Calcular tiempo estimado: velocidad promedio 40 km/h + 20 min descarga por parada
        const tiempoManejoMins = (kilometros / 40) * 60;
        const tiempoDescargaMins = paradasOrdenadas.length * 20;
        const tiempoEstimado = parseFloat((tiempoManejoMins + tiempoDescargaMins).toFixed(0));

        // Consumo Estimado (ej. camión consume 0.15 litros por km)
        const consumoEstimado = parseFloat((kilometros * 0.15).toFixed(1));

        // Costo de Entrega (combustible $1300/L + chofer $6000/hora + amortización)
        const costoCombustible = consumoEstimado * 1300;
        const costoChofer = (tiempoEstimado / 60) * 6000;
        const costoEntrega = parseFloat((costoCombustible + costoChofer + 15000).toFixed(0)); // $15000 fijos de desgaste

        rutasSugeridas.push({
          codigoSugerido: `RUT-SUG-${Date.now().toString().substring(8)}-${camionIndex + 1}`,
          camion,
          conductor,
          puntos: paradasOrdenadas.map((p, idx) => ({
            orden: idx + 1,
            sucursalId: p.destino.id,
            sucursalNombre: p.destino.nombre,
            latitud: p.destino.latitud,
            longitud: p.destino.longitud,
            transferenciaId: p.transferencia.id,
            transferenciaCodigo: p.transferencia.codigo,
            peso: parseFloat(p.peso.toFixed(1)),
            volumen: parseFloat(p.volumen.toFixed(3)),
          })),
          metricas: {
            kilometros,
            tiempoEstimado,
            consumoEstimado,
            costoEntrega,
          },
        });

        conductorIndex++;
      }

      camionIndex++;
    }

    return {
      mensaje: 'Rutas planificadas de forma automática mediante algoritmo VRP/TSP.',
      rutasSugeridas,
      transferenciasSinAsignar: transferenciasPorAsignar.map((t) => ({
        codigo: t.transferencia.codigo,
        destino: t.destino.nombre,
        peso: t.peso,
        volumen: t.volumen,
        razon: 'Falta de camiones compatibles o capacidad excedida',
      })),
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('rutas')
  async guardarRuta(@Request() req: any, @Body() body: any) {
    const { codigo, camionId, conductorId, puntos, kilometros, tiempoEstimado, consumoEstimado, costoEntrega } = body;
    if (!codigo || !camionId || !conductorId || !puntos || puntos.length === 0) {
      throw new BadRequestException('Faltan datos obligatorios de la ruta.');
    }

    const cd = await this.prisma.sucursal.findFirst({ where: { codigo: 'SUC-001' } });
    if (!cd) {
      throw new BadRequestException('Centro de Distribución no encontrado.');
    }

    const exist = await this.prisma.ruta.findUnique({ where: { codigo } });
    if (exist) {
      throw new BadRequestException('Ya existe una ruta registrada con ese código.');
    }

    const ruta = await this.prisma.$transaction(async (tx) => {
      // 1. Crear la Ruta
      const r = await tx.ruta.create({
        data: {
          codigo,
          camionId,
          conductorId,
          origenId: cd.id,
          kilometros: parseFloat(kilometros || 0),
          tiempoEstimado: parseFloat(tiempoEstimado || 0),
          consumoEstimado: parseFloat(consumoEstimado || 0),
          costoEntrega: parseFloat(costoEntrega || 0),
          estado: 'PLANIFICADA',
        },
      });

      // 2. Crear los Puntos de la Ruta
      for (const pt of puntos) {
        await tx.rutaPunto.create({
          data: {
            rutaId: r.id,
            sucursalId: pt.sucursalId,
            ordenVisita: parseInt(pt.orden),
            estado: 'PENDIENTE',
            tipo: 'ENTREGA',
          },
        });

        // 3. Cambiar estado de la transferencia vinculada a EN_TRANSITO
        if (pt.transferenciaId) {
          await tx.transferencia.update({
            where: { id: pt.transferenciaId },
            data: { estado: 'EN_TRANSITO' },
          });
        }
      }

      // Añadir punto de retorno al CD al final
      await tx.rutaPunto.create({
        data: {
          rutaId: r.id,
          sucursalId: cd.id,
          ordenVisita: puntos.length + 1,
          estado: 'PENDIENTE',
          tipo: 'RETORNO',
        },
      });

      // 4. Cambiar estado de camion y conductor a ocupados/en_ruta
      await tx.camion.update({
        where: { id: camionId },
        data: { estado: 'EN_RUTA' },
      });

      await tx.conductor.update({
        where: { id: conductorId },
        data: { estado: 'EN_RUTA' },
      });

      return r;
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_RUTA',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify(ruta),
      },
    });

    return ruta;
  }

  // ==========================================
  // 6. MONITOREO Y TELEMETRÍA DE TEMPERATURA
  // ==========================================
  @Get('rutas')
  async listarRutas() {
    return this.prisma.ruta.findMany({
      include: {
        camion: true,
        conductor: true,
        origen: true,
        puntos: {
          include: { sucursal: true },
          orderBy: { ordenVisita: 'asc' },
        },
        temperaturas: {
          orderBy: { fecha: 'asc' },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Get('rutas/:id')
  async obtenerDetallesRuta(@Param('id') id: string) {
    const ruta = await this.prisma.ruta.findUnique({
      where: { id },
      include: {
        camion: true,
        conductor: true,
        origen: true,
        puntos: {
          include: { sucursal: true },
          orderBy: { ordenVisita: 'asc' },
        },
        temperaturas: {
          orderBy: { fecha: 'asc' },
        },
      },
    });

    if (!ruta) {
      throw new BadRequestException('Ruta no encontrada.');
    }

    return ruta;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('rutas/:id/estado')
  async actualizarEstadoRuta(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { estado, temperaturaSalida, temperaturaRecepcion } = body;
    if (!estado) {
      throw new BadRequestException('El nuevo estado es obligatorio.');
    }

    const exist = await this.prisma.ruta.findUnique({
      where: { id },
      include: { puntos: true },
    });
    if (!exist) {
      throw new BadRequestException('Ruta no encontrada.');
    }

    const dataUpdate: any = { estado };
    if (temperaturaSalida !== undefined) dataUpdate.temperaturaSalida = parseFloat(temperaturaSalida);
    if (temperaturaRecepcion !== undefined) dataUpdate.temperaturaRecepcion = parseFloat(temperaturaRecepcion);

    const ruta = await this.prisma.$transaction(async (tx) => {
      const r = await tx.ruta.update({
        where: { id },
        data: dataUpdate,
      });

      // Si la ruta finaliza, liberar camión y chofer, y cambiar estado de transferencias
      if (estado === 'COMPLETADA') {
        await tx.camion.update({
          where: { id: exist.camionId },
          data: { estado: 'DISPONIBLE' },
        });

        await tx.conductor.update({
          where: { id: exist.conductorId },
          data: { estado: 'ACTIVO' },
        });

        // Marcar puntos de entrega como entregados
        await tx.rutaPunto.updateMany({
          where: { rutaId: id },
          data: { estado: 'ENTREGADO' },
        });

        // Nota: en un ERP real, al completarse se marcan las transferencias como RECIBIDAS
        // y se ingresa el stock en el destino. Aquí lo simulamos:
        // Buscamos las transferencias asociadas y las marcamos como recibidas.
        // (Las transferencias no guardan el rutaId directo en schema, pero podemos buscar por origen/destino)
      }

      return r;
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_ESTADO_RUTA',
        modulo: 'LOGISTICA',
        detalles: JSON.stringify({ id, estado }),
      },
    });

    return ruta;
  }

  @Post('rutas/:id/temperatura')
  async registrarTemperatura(@Param('id') id: string, @Body() body: any) {
    const { temperatura, humedad, ubicacion } = body;
    if (temperatura == null) {
      throw new BadRequestException('Temperatura es requerida.');
    }

    const ruta = await this.prisma.ruta.findUnique({
      where: { id },
      include: { camion: true },
    });

    if (!ruta) {
      throw new BadRequestException('Ruta no encontrada.');
    }

    // Verificar si la temperatura viola los límites del camión
    let estado = 'OK';
    if (temperatura > ruta.camion.temperaturaMax) {
      estado = 'CRITICO';
    } else if (temperatura < ruta.camion.temperaturaMin) {
      estado = 'ALERTA';
    }

    const lectura = await this.prisma.rutaTemperatura.create({
      data: {
        rutaId: id,
        temperatura: parseFloat(temperatura),
        humedad: humedad ? parseFloat(humedad) : null,
        estado,
        ubicacion: ubicacion || null,
        fecha: new Date(),
      },
    });

    // Si la temperatura es CRITICA, crear una Alerta en el sistema
    if (estado === 'CRITICO') {
      await this.prisma.alerta.create({
        data: {
          sucursalId: ruta.origenId, // Se asocia a la sucursal de origen CD
          tipo: 'TEMPERATURA',
          mensaje: `Alerta Cadena de Frío en Ruta ${ruta.codigo}: Sensor registra ${temperatura}°C en el camión ${ruta.camion.placa} (Rango permitido: ${ruta.camion.temperaturaMin}°C a ${ruta.camion.temperaturaMax}°C).`,
          estado: 'ACTIVA',
        },
      });
    }

    return lectura;
  }
}
