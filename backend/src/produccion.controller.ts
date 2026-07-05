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
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('produccion')
export class ProduccionController implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedWorkCenters();
  }

  private async seedWorkCenters() {
    const count = await this.prisma.centroTrabajo.count();
    if (count > 0) return;

    const defaultWorkCenters = [
      { id: 'WC-PAST', nombre: 'Pasteurización', descripcion: 'Pasteurizar y enfriar la leche', duracionEstimada: 30, orden: 1, datosRequeridos: JSON.stringify([
        { label: 'Temperatura Pasteurización', name: 'temp_pasteurizacion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Pasteurización', name: 'ph_pasteurizacion', type: 'number', required: true },
        { label: 'Temperatura Enfriamiento', name: 'temp_enfriamiento', type: 'number', required: true, suffix: '°C' },
      ])},
      { id: 'WC-CUAJ', nombre: 'Cuajado', descripcion: 'Agregar cultivo, cuajo y reposo', duracionEstimada: 45, orden: 2, datosRequeridos: JSON.stringify([
        { label: 'Lote de Cultivo', name: 'lote_cultivo', type: 'text', required: true },
        { label: 'Dosis de Cultivo', name: 'dosis_cultivo', type: 'number', required: true, suffix: 'g/L' },
        { label: 'Lote de Cuajo', name: 'lote_cuajo', type: 'text', required: true },
        { label: 'Dosis de Cuajo', name: 'dosis_cuajo', type: 'number', required: true, suffix: 'mL/L' },
        { label: 'Temperatura Cuajado', name: 'temp_cuajado', type: 'number', required: true, suffix: '°C' },
        { label: 'Tiempo de Reposo', name: 'tiempo_reposo', type: 'number', required: true, suffix: 'min' },
      ])},
      { id: 'WC-CORTE', nombre: 'Corte de Cuajada', descripcion: 'Corte y agitación de la cuajada', duracionEstimada: 10, orden: 3, datosRequeridos: JSON.stringify([
        { label: 'Tamaño de Grano', name: 'tamano_grano', type: 'text', required: true, suffix: 'mm' },
        { label: 'Tiempo de Agitación', name: 'tiempo_agitacion', type: 'number', required: true, suffix: 'min' },
        { label: 'Velocidad de Agitación', name: 'velocidad_agitacion', type: 'number', required: true, suffix: 'RPM' },
      ])},
      { id: 'WC-COCC', nombre: 'Cocción', descripcion: 'Cocción controlada de la mezcla', duracionEstimada: 20, orden: 4, datosRequeridos: JSON.stringify([
        { label: 'Temperatura Cocción', name: 'temp_coccion', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Final Cocción', name: 'ph_coccion', type: 'number', required: true },
      ])},
      { id: 'WC-DESU', nombre: 'Desuerado', descripcion: 'Separación del suero de la leche', duracionEstimada: 15, orden: 5, datosRequeridos: JSON.stringify([
        { label: 'Volumen Suero Obtenido', name: 'volumen_suero', type: 'number', required: true, suffix: 'L' },
        { label: 'pH Suero', name: 'ph_suero', type: 'number', required: true },
      ])},
      { id: 'WC-MOLD', nombre: 'Moldeado', descripcion: 'Llenado de moldes con cuajada', duracionEstimada: 15, orden: 6, datosRequeridos: JSON.stringify([
        { label: 'Cantidad de Moldes Llenados', name: 'cantidad_moldes', type: 'number', required: true, suffix: 'uds' },
        { label: 'Tipo de Molde', name: 'tipo_molde', type: 'text', required: true },
      ])},
      { id: 'WC-PREN', nombre: 'Prensado', descripcion: 'Aplicar presión para compactar', duracionEstimada: 120, orden: 7, datosRequeridos: JSON.stringify([
        { label: 'Presión Aplicada', name: 'presion_applied', type: 'number', required: true, suffix: 'PSI' },
        { label: 'Tiempo de Prensa', name: 'tiempo_prensa', type: 'number', required: true, suffix: 'horas' },
      ])},
      { id: 'WC-SALA', nombre: 'Salado', descripcion: 'Inmersión en tina de salmuera', duracionEstimada: 60, orden: 8, datosRequeridos: JSON.stringify([
        { label: 'Concentración Salmuera', name: 'concentracion_salmuera', type: 'number', required: true, suffix: '% o °Baumé' },
        { label: 'Temperatura Salmuera', name: 'temp_salmuera', type: 'number', required: true, suffix: '°C' },
        { label: 'pH Salmuera', name: 'ph_salmuera', type: 'number', required: true },
      ])},
      { id: 'WC-MADU', nombre: 'Maduración', descripcion: 'Control de temperatura y humedad en cámara', duracionEstimada: 14400, orden: 9, datosRequeridos: JSON.stringify([
        { label: 'Temperatura Cámara', name: 'temp_camara', type: 'number', required: true, suffix: '°C' },
        { label: 'Humedad Relativa', name: 'humedad_relativa', type: 'number', required: true, suffix: '%' },
        { label: 'Tiempo Maduración Planificado', name: 'tiempo_maduracion_dias', type: 'number', required: true, suffix: 'días' },
      ])},
      { id: 'WC-EMPA', nombre: 'Empaque', descripcion: 'Empaque, etiquetado y pesaje de quesos', duracionEstimada: 30, orden: 10, datosRequeridos: JSON.stringify([
        { label: 'Unidades Empacadas', name: 'unidades_empacadas', type: 'number', required: true, suffix: 'uds' },
        { label: 'Lote Bolsa/Empaque', name: 'lote_empaque', type: 'text', required: true },
        { label: 'Peso Neto Total', name: 'peso_neto_total', type: 'number', required: true, suffix: 'kg' },
      ])},
      { id: 'WC-CFRI', nombre: 'Cámara Fría', descripcion: 'Almacenamiento y despacho del producto terminado', duracionEstimada: 60, orden: 11, datosRequeridos: JSON.stringify([
        { label: 'Temperatura Almacenamiento', name: 'temp_almacenamiento', type: 'number', required: true, suffix: '°C' },
        { label: 'Fecha Estimada Despacho', name: 'fecha_despacho_estimada', type: 'date', required: true },
      ])},
    ];

    for (const wc of defaultWorkCenters) {
      await this.prisma.centroTrabajo.create({ data: wc });
    }
  }

  // --- CENTROS DE TRABAJO CRUD ---
  @Get('centros-trabajo')
  async listarCentrosTrabajo() {
    return this.prisma.centroTrabajo.findMany({
      orderBy: { orden: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('centros-trabajo')
  async crearCentroTrabajo(@Request() req: any, @Body() body: any) {
    const { id, nombre, descripcion, duracionEstimada, datosRequeridos, orden } = body;
    if (!id || !nombre) {
      throw new BadRequestException('El ID y el Nombre son obligatorios.');
    }

    const existe = await this.prisma.centroTrabajo.findUnique({
      where: { id },
    });
    if (existe) {
      throw new BadRequestException('Ya existe un centro de trabajo con ese ID.');
    }

    const nuevo = await this.prisma.centroTrabajo.create({
      data: {
        id,
        nombre,
        descripcion: descripcion || '',
        duracionEstimada: parseInt(duracionEstimada) || 30,
        datosRequeridos: datosRequeridos ? (typeof datosRequeridos === 'string' ? datosRequeridos : JSON.stringify(datosRequeridos)) : null,
        orden: parseInt(orden) || 0,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `CREAR_CENTRO_TRABAJO`,
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ id, nombre }),
      },
    });

    return nuevo;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put('centros-trabajo/:id')
  async actualizarCentroTrabajo(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { nombre, descripcion, duracionEstimada, datosRequeridos, orden } = body;
    if (!nombre) {
      throw new BadRequestException('El Nombre es obligatorio.');
    }

    const actualizado = await this.prisma.centroTrabajo.update({
      where: { id },
      data: {
        nombre,
        descripcion: descripcion || '',
        duracionEstimada: parseInt(duracionEstimada) || 30,
        datosRequeridos: datosRequeridos ? (typeof datosRequeridos === 'string' ? datosRequeridos : JSON.stringify(datosRequeridos)) : null,
        orden: parseInt(orden) || 0,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `ACTUALIZAR_CENTRO_TRABAJO`,
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ id, nombre }),
      },
    });

    return actualizado;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete('centros-trabajo/:id')
  async eliminarCentroTrabajo(@Param('id') id: string, @Request() req: any) {
    // Verificar si hay órdenes activas usándolo
    const opActivas = await this.prisma.ordenProduccionOperacion.count({
      where: {
        workCenter: id,
        estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
      },
    });

    if (opActivas > 0) {
      throw new BadRequestException(
        'No se puede eliminar el centro de trabajo porque hay órdenes de producción activas en curso que lo utilizan.',
      );
    }

    // Eliminar referencias en BillOfOperations
    await this.prisma.billOfOperations.deleteMany({
      where: { workCenter: id },
    });

    const eliminado = await this.prisma.centroTrabajo.delete({
      where: { id },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: `ELIMINAR_CENTRO_TRABAJO`,
        modulo: 'PRODUCCION',
        detalles: JSON.stringify({ id }),
      },
    });

    return eliminado;
  }

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
          include: { producto: true, lote: true },
        },
        mermas: {
          include: { producto: true },
        },
        inspecciones: true,
        lotesProducidos: true,
        operaciones: {
          orderBy: { orden: 'asc' },
        },
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

    const leadTime = receta.productoFinal?.leadTime || 0;
    const fechaEntrega = new Date();
    fechaEntrega.setDate(fechaEntrega.getDate() + leadTime);

    const op = await this.prisma.ordenProduccion.create({
      data: {
        numeroOrden,
        recetaId,
        sucursalId,
        cantidadPlanificada: parseFloat(cantidadPlanificada),
        creadoPorId: req.user.id,
        responsableId,
        estado: 'PLANIFICADA',
        fechaEntrega,
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
    if (op.estado !== 'PLANIFICADA' && !(op.estado === 'FALTANTES' && op.pickingCompletado)) {
      if (op.estado === 'FALTANTES') {
        throw new BadRequestException(
          'No se puede iniciar una orden con faltantes de materia prima (Shortages).',
        );
      }
      throw new BadRequestException(
        'Solo se pueden iniciar órdenes en estado PLANIFICADA o con picking completado.',
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

            const bodOrigen = await this.obtenerBodegaParaProducto(cdId, reqDetalle.productoId, tx);
            if (!bodOrigen) throw new BadRequestException('No se encontró bodega de origen.');

            // Registrar Movimiento de inventario
            await tx.movimientoInventario.create({
              data: {
                tipo: 'SALIDA',
                productoId: reqDetalle.productoId,
                loteId: lote.id,
                sucursalOrigenId: cdId,
                bodegaOrigenId: bodOrigen.id,
                cantidad: aDescontar,
                motivo: `Consumo materia prima en Orden de Producción ${op.numeroOrden}`,
                usuarioId: req.user.id,
              },
            });

            // Decrementar del inventario general
            const invs = await tx.inventario.findMany({
              where: {
                productoId: reqDetalle.productoId,
                bodegaId: bodOrigen.id,
              },
            });

            let cantRestante = aDescontar;
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

            if (cantRestante > 0) {
              if (sortedInvs.length > 0) {
                await tx.inventario.update({
                  where: { id: sortedInvs[0].id },
                  data: { existencia: { decrement: cantRestante } },
                });
              } else {
                await tx.inventario.create({
                  data: {
                    productoId: reqDetalle.productoId,
                    sucursalId: cdId,
                    bodegaId: bodOrigen.id,
                    binId: null,
                    existencia: -cantRestante,
                  },
                });
              }
            }

            pendientePorDescontar -= aDescontar;
          }

          // Si aún falta stock (shortage), descontar la diferencia restante de inventario general
          if (pendientePorDescontar > 0) {
            const bodOrigen = await this.obtenerBodegaParaProducto(cdId, reqDetalle.productoId, tx);
            if (!bodOrigen) throw new BadRequestException('No se encontró bodega de origen.');

            const invs = await tx.inventario.findMany({
              where: {
                productoId: reqDetalle.productoId,
                bodegaId: bodOrigen.id,
              },
            });

            let cantRestanteDeficit = pendientePorDescontar;
            const sortedInvs = [...invs].sort((a, b) => {
              if (a.binId === null) return -1;
              if (b.binId === null) return 1;
              return b.existencia - a.existencia;
            });

            for (const inv of sortedInvs) {
              if (cantRestanteDeficit <= 0) break;
              const aDeducir = Math.min(inv.existencia, cantRestanteDeficit);
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDeducir } },
              });
              cantRestanteDeficit -= aDeducir;
            }

            if (cantRestanteDeficit > 0) {
              if (sortedInvs.length > 0) {
                await tx.inventario.update({
                  where: { id: sortedInvs[0].id },
                  data: { existencia: { decrement: cantRestanteDeficit } },
                });
              } else {
                await tx.inventario.create({
                  data: {
                    productoId: reqDetalle.productoId,
                    sucursalId: cdId,
                    bodegaId: bodOrigen.id,
                    binId: null,
                    existencia: -cantRestanteDeficit,
                  },
                });
              }
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
                bodegaOrigenId: bodOrigen.id,
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

          const bodM = await this.obtenerBodegaParaProducto(cdId, m.productoId, tx);
          if (!bodM) throw new BadRequestException('No se encontró bodega para la merma.');

          // Descontar inventario de la merma de materia prima si no se descontó en FEFO
          const invsM = await tx.inventario.findMany({
            where: {
              productoId: m.productoId,
              bodegaId: bodM.id,
            },
          });

          let cantRestanteMerma = parseFloat(m.cantidad);
          const sortedInvs = [...invsM].sort((a, b) => {
            if (a.binId === null) return -1;
            if (b.binId === null) return 1;
            return b.existencia - a.existencia;
          });

          for (const inv of sortedInvs) {
            if (cantRestanteMerma <= 0) break;
            const aDeducir = Math.min(inv.existencia, cantRestanteMerma);
            await tx.inventario.update({
              where: { id: inv.id },
              data: { existencia: { decrement: aDeducir } },
            });
            cantRestanteMerma -= aDeducir;
          }

          if (cantRestanteMerma > 0 && sortedInvs.length > 0) {
            await tx.inventario.update({
              where: { id: sortedInvs[0].id },
              data: { existencia: { decrement: cantRestanteMerma } },
            });
          }
        }
      }

      // 3. Crear o actualizar Lote para el producto terminado producido
      const vidaUtil = op.receta.productoFinal.vidaUtilDias || 30;
      const fechaVen = new Date();
      fechaVen.setDate(fechaVen.getDate() + vidaUtil);

      let uniqueLoteNumero = loteNumero;
      let suffix = 1;
      while (true) {
        const duplicateLote = await tx.lote.findFirst({
          where: {
            numeroLote: uniqueLoteNumero,
            NOT: {
              ordenProduccionId: op.id,
            },
          },
        });
        if (!duplicateLote) {
          break;
        }
        uniqueLoteNumero = `${loteNumero}-${suffix}`;
        suffix++;
      }

      const existingLote = await tx.lote.findFirst({
        where: {
          ordenProduccionId: op.id,
        },
      });

      let nuevoLote;
      if (existingLote) {
        nuevoLote = await tx.lote.update({
          where: { id: existingLote.id },
          data: {
            numeroLote: uniqueLoteNumero,
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
            numeroLote: uniqueLoteNumero,
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

      const bodDestino = await this.obtenerBodegaParaProducto(cdId, op.receta.productoFinalId, tx);
      if (!bodDestino) throw new BadRequestException('No se encontró bodega de destino.');

      // 4. Incrementar inventario del producto terminado targeting binId: null
      const invFinal = await tx.inventario.findFirst({
        where: {
          productoId: op.receta.productoFinalId,
          bodegaId: bodDestino.id,
          binId: null,
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
            bodegaId: bodDestino.id,
            binId: null,
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
          bodegaDestinoId: bodDestino.id,
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

        const bodDestino = await this.obtenerBodegaParaProducto(cdId, det.productoId, tx);
        if (!bodDestino) throw new BadRequestException('No se encontró bodega de destino.');

        const invGen = await tx.inventario.findFirst({
          where: { productoId: det.productoId, bodegaId: bodDestino.id, binId: null },
        });
        if (invGen) {
          await tx.inventario.update({
            where: { id: invGen.id },
            data: { existencia: { increment: det.cantidadConsumida } },
          });
        } else {
          await tx.inventario.create({
            data: {
              productoId: det.productoId,
              sucursalId: cdId,
              bodegaId: bodDestino.id,
              binId: null,
              existencia: det.cantidadConsumida,
            },
          });
        }

        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: det.productoId,
            loteId: det.loteId,
            sucursalDestinoId: cdId,
            bodegaDestinoId: bodDestino.id,
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

      const targetBodega = await this.obtenerBodegaParaProducto(sucursalId, productoId, tx);
      if (!targetBodega) throw new BadRequestException('No se encontró bodega para el producto.');

      // Descontar inventario general de la sucursal across bins
      const invs = await tx.inventario.findMany({
        where: { productoId, bodegaId: targetBodega.id },
      });

      let cantRestante = parseFloat(cantidad);
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

      if (cantRestante > 0) {
        if (sortedInvs.length > 0) {
          await tx.inventario.update({
            where: { id: sortedInvs[0].id },
            data: { existencia: { decrement: cantRestante } },
          });
        } else {
          await tx.inventario.create({
            data: {
              productoId,
              sucursalId,
              bodegaId: targetBodega.id,
              binId: null,
              existencia: -cantRestante,
            },
          });
        }
      }

      // Registrar movimiento de inventario de salida
      await tx.movimientoInventario.create({
        data: {
          tipo: 'SALIDA',
          productoId,
          sucursalOrigenId: sucursalId,
          bodegaOrigenId: targetBodega.id,
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

    // 1. Obtener todas las sucursales activas
    const sucursales = await this.prisma.sucursal.findMany({
      where: { estado: 'ACTIVO' },
    });
    const plantaPrincipal = sucursales.find((s) => s.codigo === 'SUC-001');

    // 2. Obtener recetas y mapear los productos finales que tienen receta configurada
    const recetas = await this.prisma.receta.findMany({
      include: {
        productoFinal: true,
      },
    });
    const productoIdsConReceta = recetas.map((r) => r.productoFinalId);

    // 3. Obtener productos ACTIVO de tipo PRODUCTO_TERMINADO/PT que tengan receta
    //    (sin filtrar por marca para ser compatible con cualquier configuración)
    const productos = await this.prisma.producto.findMany({
      where: {
        id: { in: productoIdsConReceta },
        estado: 'ACTIVO',
        tipoProducto: { in: ['PRODUCTO_TERMINADO', 'PT'] },
      },
    });

    // 3.5. Descontar órdenes abiertas en la Planta Principal (PLANIFICADA / EN_PROCESO)
    const openCDOrders = plantaPrincipal
      ? await this.prisma.ordenProduccion.findMany({
          where: {
            sucursalId: plantaPrincipal.id,
            estado: { in: ['PLANIFICADA', 'EN_PROCESO'] },
          },
          include: { receta: true },
        })
      : [];

    const remainingOpenCDQtyMap: Record<string, number> = {};
    for (const prod of productos) {
      const prodOrders = openCDOrders.filter((o) => o.receta.productoFinalId === prod.id);
      remainingOpenCDQtyMap[prod.id] = prodOrders.reduce((sum, o) => sum + o.cantidadPlanificada, 0);
    }

    const propuestas: any[] = [];
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 4. Calcular para todas las sucursales activas (incluida la planta, que también es PdV)
    for (const suc of sucursales) {
      for (const prod of productos) {
        // A. Inventario en sucursal
        const invs = await this.prisma.inventario.findMany({
          where: { productoId: prod.id, sucursalId: suc.id },
        });
        const stockActual = invs.reduce((sum, i) => sum + i.existencia, 0);

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
            estado: { in: ['PLANIFICADA', 'EN_PROCESO'] },
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
          const stockMinimoSeguridad = invs.length > 0 ? invs.reduce((sum, i) => sum + i.existMin, 0) : 5;
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
              leadTime: prod.leadTime || 0,
              alertaRiesgo: diasInventario <= (prod.leadTime || 2) ? 'CRITICO' : 'STOCK_BAJO',
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

    // 1. Obtener Planta Principal SUC-001 (fallback a primera sucursal activa si no existe)
    let cd = await this.prisma.sucursal.findFirst({
      where: { codigo: 'SUC-001', estado: 'ACTIVO' },
    });
    if (!cd) {
      cd = await this.prisma.sucursal.findFirst({ where: { estado: 'ACTIVO' } });
    }
    if (!cd) {
      throw new BadRequestException(
        'No hay ninguna sucursal activa en el sistema. Configure al menos una sucursal.',
      );
    }

    // 2. Buscar proveedor interno (fallback al primer proveedor disponible)
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

    // 3. Agrupar propuestas por productoId (consolidar todas las sucursales)
    const agrupado: Record<string, number> = {};
    for (const prop of propuestas) {
      const pId = prop.productoId;
      const qty = parseFloat(prop.cantidadSugerida);
      if (pId && qty > 0) {
        agrupado[pId] = (agrupado[pId] || 0) + qty;
      }
    }

    const resultados: any[] = [];

    // 4. Procesar cada producto de forma independiente (un fallo no cancela los demás)
    for (const [productoId, totalAProducir] of Object.entries(agrupado)) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Buscar receta
          const receta = await tx.receta.findFirst({
            where: { productoFinalId: productoId },
            include: { productoFinal: true },
          });

          if (!receta) {
            resultados.push({
              productoId,
              estado: 'ERROR',
              mensaje: 'No existe receta configurada para este producto.',
            });
            return;
          }

          const prod = receta.productoFinal;

          // Generar código único de OP y lote
          const randomSuffix = Math.floor(Math.random() * 9000 + 1000).toString();
          const timestamp = Date.now().toString().substring(7);
          const numeroOrden = `OP-PLAN-${timestamp}-${randomSuffix}`;
          const d = new Date();
          const yy = d.getUTCFullYear().toString().substring(2);
          const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
          const ddStr = d.getUTCDate().toString().padStart(2, '0');
          const loteNumero = `L${yy}${mm}${ddStr}-${randomSuffix}`;

          const leadTime = prod.leadTime || 0;
          const fechaEntrega = new Date();
          fechaEntrega.setDate(fechaEntrega.getDate() + leadTime);

          // Crear Orden de Producción en la planta principal
          const op = await tx.ordenProduccion.create({
            data: {
              numeroOrden,
              recetaId: receta.id,
              sucursalId: cd.id,
              cantidadPlanificada: totalAProducir,
              estado: 'PLANIFICADA',
              creadoPorId: req.user.id,
              responsableId: req.user.id,
              fechaEntrega,
            },
          });

          // Crear Lote reservado (cantidadActual = 0, se llena al completar la OP)
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

          // Auditoría
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
                sucursalId: cd.id,
              }),
            },
          });
        });
      } catch (err: any) {
        resultados.push({
          productoId,
          estado: 'ERROR',
          mensaje: err?.message || 'Error inesperado al crear la orden de producción.',
        });
      }
    }

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

      const targetBodega = await this.obtenerBodegaParaProducto(cdId, reqDetalle.productoId);
      const esBodegaLeche = targetBodega ? (
        targetBodega.tipoBodega === 'LECHE_ENTERA_FLUIDA' || 
        targetBodega.tipoBodega === 'LECHE_ENTERA' ||
        targetBodega.tipoBodega === 'LECHE_DESCREMADA' ||
        targetBodega.nombre.toLowerCase().includes('leche entera') ||
        targetBodega.nombre.toLowerCase().includes('leche descremada') ||
        targetBodega.codigo.toLowerCase().includes('leche')
      ) : false;
      const invs = targetBodega ? await this.prisma.inventario.findMany({
        where: {
          productoId: reqDetalle.productoId,
          bodegaId: targetBodega.id,
        },
        include: { bin: true },
      }) : [];
      let stockDisponible = 0;
      let binInfo: any = null;
      let disableTankSelection = false;
      let binsMezcla: any[] = [];

      let bodegaBins: any[] = [];
      if (esBodegaLeche && targetBodega) {
        const rawBins = await this.prisma.bin.findMany({
          where: { bodegaId: targetBodega.id, estado: 'ACTIVO' },
          orderBy: { codigo: 'asc' },
        });
        const um = reqDetalle.producto.unidadMedida?.toUpperCase();
        const isIntegerUnit = um === 'UNIDAD' || um === 'U';
        bodegaBins = rawBins.map(b => {
          const matchedInv = invs.find(i => i.binId === b.id);
          const ext = matchedInv ? matchedInv.existencia : 0;
          return {
            id: b.id,
            codigo: b.codigo,
            nombre: b.nombre,
            capacidad: b.capacidad,
            unidad: b.unidad,
            existencia: isIntegerUnit ? ext : Math.round(ext * 100000) / 100000,
          };
        });
      }

      const tank1Inv = invs.find(i => i.bin?.codigo === 'TANK-01');

      if (esBodegaLeche) {
        // Resolve target bin
        if (op.pickingCompletado) {
          const mezcla = await this.prisma.mezclaLeche.findFirst({
            where: {
              ordenProduccionId: op.id,
              loteMixto: {
                productoId: reqDetalle.productoId,
              },
            },
            include: {
              componentes: {
                include: {
                  loteOrigen: {
                    include: { bin: true }
                  }
                }
              }
            }
          });
          if (mezcla && mezcla.componentes.length > 0) {
            const uniqueBins: any[] = [];
            const seenBinIds = new Set<string>();
            for (const comp of mezcla.componentes) {
              const b = comp.loteOrigen?.bin;
              if (b && !seenBinIds.has(b.id)) {
                seenBinIds.add(b.id);
                uniqueBins.push({
                  id: b.id,
                  codigo: b.codigo,
                  nombre: b.nombre,
                  capacidad: b.capacidad,
                });
              }
            }
            binsMezcla = uniqueBins;
            if (uniqueBins.length > 0) {
              binInfo = uniqueBins[0];
            }
          }
        }

        // If not completed or could not resolve completed bin, default to TANK-01
        if (!binInfo) {
          const tank1Bin = bodegaBins.find(b => b.codigo === 'TANK-01');
          if (tank1Bin) {
            binInfo = {
              id: tank1Bin.id,
              codigo: tank1Bin.codigo,
              nombre: tank1Bin.nombre,
              capacidad: tank1Bin.capacidad,
            };
          } else if (tank1Inv?.bin) {
            binInfo = {
              id: tank1Inv.bin.id,
              codigo: tank1Inv.bin.codigo,
              nombre: tank1Inv.bin.nombre,
              capacidad: tank1Inv.bin.capacidad,
            };
          } else {
            // Fallback to first bin if TANK-01 not found
            const firstBinInv = invs.find(i => i.bin !== null);
            if (firstBinInv?.bin) {
              binInfo = {
                id: firstBinInv.bin.id,
                codigo: firstBinInv.bin.codigo,
                nombre: firstBinInv.bin.nombre,
                capacidad: firstBinInv.bin.capacidad,
              };
            } else if (bodegaBins.length > 0) {
              binInfo = {
                id: bodegaBins[0].id,
                codigo: bodegaBins[0].codigo,
                nombre: bodegaBins[0].nombre,
                capacidad: bodegaBins[0].capacidad,
              };
            }
          }
        }

        // Determine stock based on resolved binInfo
        if (binInfo) {
          const matchedInv = invs.find(i => i.binId === binInfo.id);
          stockDisponible = matchedInv ? matchedInv.existencia : 0;
        }

        // Disable selection if TANK-01 has stock
        if (tank1Inv && tank1Inv.existencia > 0) {
          disableTankSelection = true;
        }
      } else {
        // Normal products: sum all inventories
        stockDisponible = invs.reduce((sum, i) => sum + i.existencia, 0);
        const mainInv = invs.find(i => i.binId === null) || invs[0];
        binInfo = mainInv?.bin ? { id: mainInv.bin.id, codigo: mainInv.bin.codigo, nombre: mainInv.bin.nombre, capacidad: mainInv.bin.capacidad } : null;
      }

      // Obtener stock y lotes para cada sustituto
      const sustitutosInfo: any[] = [];
      for (const sust of reqDetalle.sustitutos) {
        const sustBodega = await this.obtenerBodegaParaProducto(cdId, sust.productoId);
        const invsSust = sustBodega ? await this.prisma.inventario.findMany({
          where: {
            productoId: sust.productoId,
            bodegaId: sustBodega.id,
          },
        }) : [];
        const stockSust = invsSust.reduce((sum, i) => sum + i.existencia, 0);

        const lotesSust = await this.prisma.lote.findMany({
          where: {
            productoId: sust.productoId,
            cantidadActual: { gt: 0 },
            estado: 'APROBADO',
          },
          orderBy: { fechaVencimiento: 'asc' },
        });

        const uSust = sust.producto.unidadMedida?.toUpperCase();
        const isSustInt = uSust === 'UNIDAD' || uSust === 'U';

        sustitutosInfo.push({
          productoId: sust.productoId,
          sku: sust.producto.sku,
          descripcion: sust.producto.descripcion,
          unidadMedida: sust.producto.unidadMedida || 'U',
          stockDisponible: isSustInt ? stockSust : Math.round(stockSust * 100000) / 100000,
          lotesDisponibles: lotesSust.map((l) => ({
            id: l.id,
            numeroLote: l.numeroLote,
            cantidadActual: isSustInt ? l.cantidadActual : Math.round(l.cantidadActual * 100000) / 100000,
          })),
          bodega: sustBodega ? {
            id: sustBodega.id,
            codigo: sustBodega.codigo,
            nombre: sustBodega.nombre,
          } : null,
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

      const umedida = reqDetalle.producto.unidadMedida?.toUpperCase();
      const isInteger = umedida === 'UNIDAD' || umedida === 'U';

      ingredientes.push({
        productoId: reqDetalle.productoId,
        esBodegaLeche,
        sku: reqDetalle.producto.sku,
        descripcion: reqDetalle.producto.descripcion,
        unidadMedida: reqDetalle.producto.unidadMedida || 'U',
        cantidadRequerida: isInteger ? cantidadRequerida : Math.round(cantidadRequerida * 100000) / 100000,
        stockDisponible: isInteger ? stockDisponible : Math.round(stockDisponible * 100000) / 100000,
        yaEntregado: isInteger ? yaEntregado : Math.round(yaEntregado * 100000) / 100000,
        cantidadPicked: isInteger ? cantidadPicked : Math.round(cantidadPicked * 100000) / 100000,
        picked: op.pickingCompletado,
        loteNumero,
        lotesDisponibles: lotes.map((l) => ({
          id: l.id,
          numeroLote: l.numeroLote,
          cantidadActual: isInteger ? l.cantidadActual : Math.round(l.cantidadActual * 100000) / 100000,
        })),
        sustitutos: sustitutosInfo,
        bodega: targetBodega ? {
          id: targetBodega.id,
          codigo: targetBodega.codigo,
          nombre: targetBodega.nombre,
        } : null,
        bin: binInfo,
        bins: bodegaBins,
        binsMezcla,
        disableTankSelection,
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
        const bodOrigen = await this.obtenerBodegaParaProducto(cdId, actualProductoId, tx);
        if (!bodOrigen) throw new BadRequestException('No se encontró bodega de origen.');

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

        const esBodegaLeche = bodOrigen.tipoBodega === 'LECHE_ENTERA_FLUIDA' || 
                              bodOrigen.tipoBodega === 'LECHE_ENTERA' ||
                              bodOrigen.tipoBodega === 'LECHE_DESCREMADA' ||
                              bodOrigen.nombre.toLowerCase().includes('leche entera') ||
                              bodOrigen.nombre.toLowerCase().includes('leche descremada') ||
                              bodOrigen.codigo.toLowerCase().includes('leche');

        if (esBodegaLeche) {
          const invs = await tx.inventario.findMany({
            where: {
              productoId: actualProductoId,
              bodegaId: bodOrigen.id,
            },
            include: { bin: true },
          });

          // Support multiple targetBinIds
          let targetBinIds: string[] = [];
          if (itemPicking.binIds && Array.isArray(itemPicking.binIds) && itemPicking.binIds.length > 0) {
            targetBinIds = itemPicking.binIds;
          } else if (itemPicking.binId) {
            targetBinIds = [itemPicking.binId];
          }

          if (targetBinIds.length === 0) {
            // Fallback: resolve using the same logic as before (TANK-01 or fallback bin)
            const tank1Inv = invs.find(i => i.bin?.codigo === 'TANK-01');
            let resolvedBinId = tank1Inv?.binId;
            if (!resolvedBinId) {
              const sortedInvs = [...invs].sort((a, b) => {
                if (a.existencia > 0 && b.existencia <= 0) return -1;
                if (b.existencia > 0 && a.existencia <= 0) return 1;
                if (a.existencia > 0 && b.existencia > 0) {
                  if (b.existencia !== a.existencia) {
                    return b.existencia - a.existencia;
                  }
                }
                const codeA = a.bin?.codigo || 'ZZZ';
                const codeB = b.bin?.codigo || 'ZZZ';
                return codeA.localeCompare(codeB);
              });
              const mainInv = sortedInvs[0];
              resolvedBinId = mainInv ? mainInv.binId : null;
            }
            if (resolvedBinId) {
              targetBinIds = [resolvedBinId];
            }
          }

          if (targetBinIds.length === 0) {
            throw new BadRequestException(`Debe seleccionar al menos un tanque de origen para ${actualProducto.descripcion}.`);
          }

          // 1. Obtener todos los lotes activos de los tanques de leche seleccionados
          const activeLotes = await tx.lote.findMany({
            where: {
              productoId: actualProductoId,
              cantidadActual: { gt: 0 },
              binId: { in: targetBinIds },
            },
            orderBy: { fechaVencimiento: 'asc' },
          });

          const totalDisponible = activeLotes.reduce((sum, l) => sum + l.cantidadActual, 0);
          if (totalDisponible < cantidadAPreparar) {
            throw new BadRequestException(
              `Stock insuficiente en los tanques seleccionados para la orden ${op.numeroOrden}. Disponible: ${totalDisponible}L. Requerido: ${cantidadAPreparar}L.`,
            );
          }

          // 2. Crear lote mixto (hijo) para la orden de producción
          const mixLoteNum = `L-MIX-${actualProducto.sku}-${Date.now()}`;
          const minVencimiento = activeLotes.length > 0 
            ? new Date(Math.min(...activeLotes.map(l => l.fechaVencimiento.getTime())))
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

          let proveedorInterno = await tx.proveedor.findFirst({
            where: { codigo: 'INTERNO' },
          });
          if (!proveedorInterno) {
            proveedorInterno = await tx.proveedor.findFirst();
            if (!proveedorInterno) {
              throw new BadRequestException(
                'Debe existir un proveedor en el sistema.',
              );
            }
          }

          const nuevoLoteMixto = await tx.lote.create({
            data: {
              numeroLote: mixLoteNum,
              productoId: actualProductoId,
              fechaProduccion: new Date(),
              fechaVencimiento: minVencimiento,
              proveedorId: proveedorInterno.id,
              temperaturaRequeridaMin: actualProducto.temperaturaMin || 2.0,
              temperaturaRequeridaMax: actualProducto.temperaturaMax || 4.0,
              cantidadInicial: cantidadAPreparar,
              cantidadActual: 0, // Consumido inmediatamente en producción
              estado: 'APROBADO',
            },
          });

          // 3. Crear registro de mezcla
          const mezcla = await tx.mezclaLeche.create({
            data: {
              loteMixtoId: nuevoLoteMixto.id,
              ordenProduccionId: op.id,
            },
          });

          // 4. Calcular deducciones secuenciales de cada lote origen (FEFO)
          let pendientePorDescontar = cantidadAPreparar;
          const descontadoPorBin: Record<string, number> = {};

          for (const lote of activeLotes) {
            if (pendientePorDescontar <= 0) {
              break;
            }
            const aDescontar = Math.min(lote.cantidadActual, pendientePorDescontar);
            const newCantidadActual = lote.cantidadActual - aDescontar;

            // Actualizar lote origen
            await tx.lote.update({
              where: { id: lote.id },
              data: { cantidadActual: newCantidadActual },
            });

            if (lote.binId) {
              descontadoPorBin[lote.binId] = (descontadoPorBin[lote.binId] || 0) + aDescontar;
            }

            // Registrar componente de la mezcla para trazabilidad
            await tx.mezclaLecheComponente.create({
              data: {
                mezclaLecheId: mezcla.id,
                loteOrigenId: lote.id,
                cantidadUsada: aDescontar,
                proporcion: aDescontar / cantidadAPreparar,
              },
            });

            pendientePorDescontar -= aDescontar;
          }

          // 5. Decrementar existencia del inventario general en la bodega para cada bin específico
          for (const [binId, cantidadADescontar] of Object.entries(descontadoPorBin)) {
            const inv = await tx.inventario.findFirst({
              where: {
                productoId: actualProductoId,
                bodegaId: bodOrigen.id,
                binId,
              },
            });
            if (inv) {
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: cantidadADescontar } },
              });
            } else {
              await tx.inventario.create({
                data: {
                  productoId: actualProductoId,
                  sucursalId: cdId,
                  bodegaId: bodOrigen.id,
                  binId,
                  existencia: -cantidadADescontar,
                },
              });
            }
          }

          // 6. Registrar en detalles de orden de producción (apuntando al lote mixto)
          await tx.ordenProduccionDetalle.create({
            data: {
              ordenProduccionId: op.id,
              productoId: actualProductoId,
              loteId: nuevoLoteMixto.id,
              cantidadConsumida: cantidadAPreparar,
            },
          });

          // 7. Registrar movimiento de inventario general de salida para la mezcla
          await tx.movimientoInventario.create({
            data: {
              tipo: 'SALIDA',
              productoId: actualProductoId,
              loteId: nuevoLoteMixto.id,
              sucursalOrigenId: cdId,
              bodegaOrigenId: bodOrigen.id,
              cantidad: cantidadAPreparar,
              motivo: `Picking de mezcla proporcional de la bodega ${bodOrigen.nombre} en Orden de Producción ${op.numeroOrden}`,
              usuarioId: req.user.id,
            },
          });

        } else {

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
                `El lote "${itemPicking.loteNumero}" no existe para el producto seleccionado.`,
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

              // Decrementar del inventario general across bins
              const invs = await tx.inventario.findMany({
                where: {
                  productoId: actualProductoId,
                  bodegaId: bodOrigen.id,
                },
              });

              let cantRestante = aDescontar;
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

              if (cantRestante > 0) {
                if (sortedInvs.length > 0) {
                  await tx.inventario.update({
                    where: { id: sortedInvs[0].id },
                    data: { existencia: { decrement: cantRestante } },
                  });
                } else {
                  await tx.inventario.create({
                    data: {
                      productoId: actualProductoId,
                      sucursalId: cdId,
                      bodegaId: bodOrigen.id,
                      binId: null,
                      existencia: -cantRestante,
                    },
                  });
                }
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
                  bodegaOrigenId: bodOrigen.id,
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

              const invs = await tx.inventario.findMany({
                where: {
                  productoId: actualProductoId,
                  bodegaId: bodOrigen.id,
                },
              });

              let cantRestante = aDescontar;
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

              if (cantRestante > 0) {
                if (sortedInvs.length > 0) {
                  await tx.inventario.update({
                    where: { id: sortedInvs[0].id },
                    data: { existencia: { decrement: cantRestante } },
                  });
                } else {
                  await tx.inventario.create({
                    data: {
                      productoId: actualProductoId,
                      sucursalId: cdId,
                      bodegaId: bodOrigen.id,
                      binId: null,
                      existencia: -cantRestante,
                    },
                  });
                }
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
                  bodegaOrigenId: bodOrigen.id,
                  cantidad: aDescontar,
                  motivo: `Picking de materia prima en Orden de Producción ${op.numeroOrden}`,
                  usuarioId: req.user.id,
                },
              });

              pendientePorDescontar -= aDescontar;
            }
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

        const totalPickedRounded = Math.round(totalPicked * 100000) / 100000;
        const cantidadRequeridaRounded = Math.round(cantidadRequerida * 100000) / 100000;

        if (totalPickedRounded < cantidadRequeridaRounded) {
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
    const { cantidadPlanificada, responsableId, estado } = body;

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id },
      include: {
        receta: {
          include: {
            detalles: {
              include: {
                producto: true,
                sustitutos: {
                  include: {
                    producto: true,
                  },
                },
              },
            },
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

    if ((op.estado !== 'PLANIFICADA' && op.estado !== 'FALTANTES') && !estado) {
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

          const bodDestino = await this.obtenerBodegaParaProducto(cdId, det.productoId, tx);
          if (!bodDestino) throw new BadRequestException('No se encontró bodega de destino.');

          const invGen = await tx.inventario.findFirst({
            where: { productoId: det.productoId, bodegaId: bodDestino.id, binId: null },
          });
          if (invGen) {
            await tx.inventario.update({
              where: { id: invGen.id },
              data: { existencia: { increment: det.cantidadConsumida } },
            });
          } else {
            await tx.inventario.create({
              data: {
                productoId: det.productoId,
                sucursalId: cdId,
                bodegaId: bodDestino.id,
                binId: null,
                existencia: det.cantidadConsumida,
              },
            });
          }

          await tx.movimientoInventario.create({
            data: {
              tipo: 'ENTRADA',
              productoId: det.productoId,
              loteId: det.loteId,
              sucursalDestinoId: cdId,
              bodegaDestinoId: bodDestino.id,
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

      // 2. Verificar si con la nueva cantidad hay shortages en el inventario actual (descontando lo ya recolectado)
      let tieneShortage = false;
      for (const reqDetalle of op.receta.detalles) {
        const totalRequerido = reqDetalle.cantidadRequerida * nuevaCantidad;

        // Obtener lo que ya fue recolectado para esta línea (incluyendo sustitutos)
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
        const alreadyPicked = aggregate._sum.cantidadConsumida || 0;

        // Balance pendiente por recolectar
        const balancePendiente = Math.max(0, totalRequerido - alreadyPicked);
        const balancePendienteRounded = Math.round(balancePendiente * 100000) / 100000;

        // Si el balance restante es mayor que 0 (redondeado a 5 decimales), verificar stock disponible
        if (balancePendienteRounded > 0) {
          const targetBodega = await this.obtenerBodegaParaProducto(cdId, reqDetalle.productoId, tx);
          const invs = targetBodega ? await tx.inventario.findMany({
            where: {
              productoId: reqDetalle.productoId,
              bodegaId: targetBodega.id,
            },
          }) : [];
          const stockDisponible = invs.reduce((sum, i) => sum + i.existencia, 0);
          const stockDisponibleRounded = Math.round(stockDisponible * 100000) / 100000;
          if (stockDisponibleRounded < balancePendienteRounded) {
            tieneShortage = true;
          }
        }
      }

      const nuevoEstado = estado || (tieneShortage ? 'FALTANTES' : 'PLANIFICADA');

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
      await tx.recepcionMaterialDetalle.deleteMany({});
      await tx.recepcionMaterial.deleteMany({});
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

      // 6b. Eliminar Mezclas de Leche (Componentes primero, luego Mezclas) - agregado con BIN/Tanques
      await tx.mezclaLecheComponente.deleteMany({});
      await tx.mezclaLeche.deleteMany({});

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
        estado: { in: ['PLANIFICADA', 'EN_PROCESO', 'FALTANTES'] },
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
    @Body() body: any,
  ) {
    const { usuarioNombre } = body || {};

    const op = await this.prisma.ordenProduccion.findUnique({
      where: { id: opId },
      include: { operaciones: true, receta: true },
    });

    if (!op) {
      throw new BadRequestException('La orden de producción no existe.');
    }

    // Inicializar operaciones si no existen
    if (op.operaciones.length === 0) {
      await this.inicializarOperaciones(opId, op.receta.productoFinalId);
      const reloaded = await this.prisma.ordenProduccion.findUnique({
        where: { id: opId },
        include: { operaciones: true },
      });
      op.operaciones = reloaded ? reloaded.operaciones : [];
    }

    const sortedOps = [...op.operaciones].sort((a, b) => a.orden - b.orden);
    const firstOp = sortedOps[0];

    if (firstOp && workCenter === firstOp.workCenter && !op.pickingCompletado) {
      throw new BadRequestException(
        `No se puede iniciar la primera operación (${firstOp.workCenter}) si el picking de materia prima no está completado.`,
      );
    }

    // Si la orden está en PLANIFICADA o FALTANTES y el workCenter es el primero, iniciar la orden general
    if (firstOp && (op.estado === 'PLANIFICADA' || op.estado === 'FALTANTES') && workCenter === firstOp.workCenter) {
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
        usuarioNombre: usuarioNombre || req.user.nombre,
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

    const sortedOps = [...op.operaciones].sort((a, b) => a.orden - b.orden);
    const lastOp = sortedOps[sortedOps.length - 1];

    // Si es el último paso, completar toda la orden de producción
    if (lastOp && workCenter === lastOp.workCenter) {
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

            const bodOrigen = await this.obtenerBodegaParaProducto(cdId, reqDetalle.productoId, tx);
            if (!bodOrigen) throw new BadRequestException('No se encontró bodega de origen.');

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
                  bodegaOrigenId: bodOrigen.id,
                  cantidad: aDescontar,
                  motivo: `Consumo materia prima en OP ${op.numeroOrden} desde Ruta Operaciones`,
                  usuarioId: req.user.id,
                },
              });

              const invs = await tx.inventario.findMany({
                where: {
                  productoId: reqDetalle.productoId,
                  bodegaId: bodOrigen.id,
                },
              });

              let cantRestante = aDescontar;
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

              if (cantRestante > 0) {
                if (sortedInvs.length > 0) {
                  await tx.inventario.update({
                    where: { id: sortedInvs[0].id },
                    data: { existencia: { decrement: cantRestante } },
                  });
                } else {
                  await tx.inventario.create({
                    data: {
                      productoId: reqDetalle.productoId,
                      sucursalId: cdId,
                      bodegaId: bodOrigen.id,
                      binId: null,
                      existencia: -cantRestante,
                    },
                  });
                }
              }

              pendientePorDescontar -= aDescontar;
            }

            if (pendientePorDescontar > 0) {
              const invs = await tx.inventario.findMany({
                where: {
                  productoId: reqDetalle.productoId,
                  bodegaId: bodOrigen.id,
                },
              });

              let cantRestanteDeficit = pendientePorDescontar;
              const sortedInvs = [...invs].sort((a, b) => {
                if (a.binId === null) return -1;
                if (b.binId === null) return 1;
                return b.existencia - a.existencia;
              });

              for (const inv of sortedInvs) {
                if (cantRestanteDeficit <= 0) break;
                const aDeducir = Math.min(inv.existencia, cantRestanteDeficit);
                await tx.inventario.update({
                  where: { id: inv.id },
                  data: { existencia: { decrement: aDeducir } },
                });
                cantRestanteDeficit -= aDeducir;
              }

              if (cantRestanteDeficit > 0) {
                if (sortedInvs.length > 0) {
                  await tx.inventario.update({
                    where: { id: sortedInvs[0].id },
                    data: { existencia: { decrement: cantRestanteDeficit } },
                  });
                } else {
                  await tx.inventario.create({
                    data: {
                      productoId: reqDetalle.productoId,
                      sucursalId: cdId,
                      bodegaId: bodOrigen.id,
                      binId: null,
                      existencia: -cantRestanteDeficit,
                    },
                  });
                }
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
                  bodegaOrigenId: bodOrigen.id,
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

            const bodMerma = await this.obtenerBodegaParaProducto(cdId, m.productoId, tx);
            const invsM = bodMerma ? await tx.inventario.findMany({
              where: { productoId: m.productoId, bodegaId: bodMerma.id },
            }) : [];

            let cantRestanteMerma = parseFloat(m.cantidad);
            const sortedInvs = [...invsM].sort((a, b) => {
              if (a.binId === null) return -1;
              if (b.binId === null) return 1;
              return b.existencia - a.existencia;
            });

            for (const inv of sortedInvs) {
              if (cantRestanteMerma <= 0) break;
              const aDeducir = Math.min(inv.existencia, cantRestanteMerma);
              await tx.inventario.update({
                where: { id: inv.id },
                data: { existencia: { decrement: aDeducir } },
              });
              cantRestanteMerma -= aDeducir;
            }

            if (cantRestanteMerma > 0 && sortedInvs.length > 0) {
              await tx.inventario.update({
                where: { id: sortedInvs[0].id },
                data: { existencia: { decrement: cantRestanteMerma } },
              });
            }
          }
        }

        // Crear/Actualizar Lote para el producto terminado
        const vidaUtil = op.receta.productoFinal.vidaUtilDias || 30;
        const fechaVen = new Date();
        fechaVen.setDate(fechaVen.getDate() + vidaUtil);

        let uniqueLoteNumero = loteNumero;
        let suffix = 1;
        while (true) {
          const duplicateLote = await tx.lote.findFirst({
            where: {
              numeroLote: uniqueLoteNumero,
              NOT: {
                ordenProduccionId: op.id,
              },
            },
          });
          if (!duplicateLote) {
            break;
          }
          uniqueLoteNumero = `${loteNumero}-${suffix}`;
          suffix++;
        }

        const existingLote = await tx.lote.findFirst({
          where: {
            ordenProduccionId: op.id,
          },
        });

        const bodDestino = await this.obtenerBodegaParaProducto(cdId, op.receta.productoFinalId, tx);
        if (!bodDestino) throw new BadRequestException('No se encontró bodega de destino.');

        // Determinar el bin destino (por defecto) para WC-CFRI
        let targetBinId: string | null = null;
        if (workCenter === 'WC-CFRI') {
          const associatedInv = await tx.inventario.findFirst({
            where: {
              productoId: op.receta.productoFinalId,
              bodegaId: bodDestino.id,
              NOT: { binId: null },
            },
            orderBy: { createdAt: 'asc' },
          });

          if (associatedInv) {
            targetBinId = associatedInv.binId;
          } else {
            const firstBin = await tx.bin.findFirst({
              where: { bodegaId: bodDestino.id, estado: 'ACTIVO' },
              orderBy: { codigo: 'asc' },
            });
            if (firstBin) {
              targetBinId = firstBin.id;
            }
          }
        }

        let nuevoLote;
        if (existingLote) {
          nuevoLote = await tx.lote.update({
            where: { id: existingLote.id },
            data: {
              numeroLote: uniqueLoteNumero,
              fechaProduccion: new Date(),
              fechaVencimiento: fechaVen,
              cantidadInicial: cantProd,
              cantidadActual: cantProd,
              estado: 'APROBADO',
              binId: targetBinId,
              ordenProduccionId: op.id,
            },
          });
        } else {
          nuevoLote = await tx.lote.create({
            data: {
              numeroLote: uniqueLoteNumero,
              productoId: op.receta.productoFinalId,
              fechaProduccion: new Date(),
              fechaVencimiento: fechaVen,
              proveedorId: proveedor.id,
              temperaturaRequeridaMin: op.receta.productoFinal.temperaturaMin || 2,
              temperaturaRequeridaMax: op.receta.productoFinal.temperaturaMax || 6,
              cantidadInicial: cantProd,
              cantidadActual: cantProd,
              estado: 'APROBADO',
              binId: targetBinId,
              ordenProduccionId: op.id,
            },
          });
        }

        // Incrementar inventario del producto terminado targeting binId: targetBinId
        const invFinal = await tx.inventario.findFirst({
          where: { productoId: op.receta.productoFinalId, bodegaId: bodDestino.id, binId: targetBinId },
        });

        if (invFinal) {
          await tx.inventario.update({
            where: { id: invFinal.id },
            data: { existencia: { increment: cantProd } },
          });
        } else {
          await tx.inventario.create({
            data: { productoId: op.receta.productoFinalId, sucursalId: cdId, bodegaId: bodDestino.id, binId: targetBinId, existencia: cantProd },
          });
        }

        await tx.movimientoInventario.create({
          data: {
            tipo: 'ENTRADA',
            productoId: op.receta.productoFinalId,
            loteId: nuevoLote.id,
            sucursalDestinoId: cdId,
            bodegaDestinoId: bodDestino.id,
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

    // Si no tiene ruta configurada, retornamos los centros de trabajo por defecto desde la base de datos
    const wcs = await this.prisma.centroTrabajo.findMany({
      orderBy: { orden: 'asc' },
    });

    return wcs.map((wc, idx) => ({
      productoId,
      workCenter: wc.id,
      orden: idx + 1,
      duracionEstimada: wc.duracionEstimada,
      datosRequeridos: wc.datosRequeridos,
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
            orden: step.orden,
            duracionEstimada: step.duracionEstimada,
            datosRequeridos: step.datosRequeridos,
          },
          update: {},
        });
      }
    } else {
      const wcs = await this.prisma.centroTrabajo.findMany({
        orderBy: { orden: 'asc' },
      });
      for (let i = 0; i < wcs.length; i++) {
        const wc = wcs[i];
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
            orden: i + 1,
            duracionEstimada: wc.duracionEstimada,
            datosRequeridos: wc.datosRequeridos,
          },
          update: {},
        });
      }
    }
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
