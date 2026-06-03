import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('calidad')
export class CalidadController {
  constructor(private prisma: PrismaService) {}

  // --- RECEPCIÓN DE LECHE ---
  @Get('recepcion-leche')
  async listarControlesLeche() {
    return this.prisma.controlLeche.findMany({
      include: {
        inspector: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CALIDAD')
  @Post('recepcion-leche')
  async crearControlLeche(@Request() req: any, @Body() body: any) {
    const { recepcionId, loteId, temperatura, grasa, proteina, acidez, antibioticos, resultado, observaciones } = body;

    if (temperatura == null || grasa == null || proteina == null || acidez == null || antibioticos == null) {
      throw new BadRequestException('La temperatura, grasa, proteína, acidez y antibióticos son parámetros obligatorios.');
    }

    const control = await this.prisma.controlLeche.create({
      data: {
        recepcionId,
        loteId,
        temperatura: parseFloat(temperatura),
        grasa: parseFloat(grasa),
        proteina: parseFloat(proteina),
        acidez: parseFloat(acidez),
        antibioticos: Boolean(antibioticos),
        resultado: resultado || 'APROBADO',
        inspectorId: req.user.id,
        observaciones,
      }
    });

    // Si el control de calidad rechaza el lote, actualizamos el estado del lote a RECHAZADO o CUARENTENA
    if (loteId && (resultado === 'RECHAZADO' || resultado === 'CUARENTENA')) {
      await this.prisma.lote.update({
        where: { id: loteId },
        data: { estado: resultado }
      });

      // Crear Alerta automática
      await this.prisma.alerta.create({
        data: {
          sucursalId: req.user.sucursalId || (await this.prisma.sucursal.findFirst())?.id || '',
          tipo: 'TEMPERATURA',
          mensaje: `Lote de leche ${loteId} fue RECHAZADO por control de calidad. Motivo: ${observaciones || 'Fuera de rango'}.`,
          estado: 'ACTIVA',
        }
      });
    }

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_CONTROL_LECHE',
        modulo: 'CALIDAD',
        detalles: JSON.stringify(control),
      },
    });

    return control;
  }

  // --- INSPECCIONES GENERALES (PROCESO / PRODUCTO TERMINADO) ---
  @Get('inspecciones')
  async listarInspecciones() {
    return this.prisma.controlCalidad.findMany({
      include: {
        ordenProduccion: true,
        inspector: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CALIDAD')
  @Post('inspeccion')
  async crearInspeccion(@Request() req: any, @Body() body: any) {
    const { tipo, ordenProduccionId, loteId, temperatura, ph, parametrosCriticos, resultado, observaciones } = body;

    if (!tipo || !parametrosCriticos) {
      throw new BadRequestException('El tipo de inspección (PROCESO/PRODUCTO_TERMINADO) y los parámetros críticos son obligatorios.');
    }

    const control = await this.prisma.controlCalidad.create({
      data: {
        tipo,
        ordenProduccionId,
        loteId,
        temperatura: temperatura != null ? parseFloat(temperatura) : null,
        ph: ph != null ? parseFloat(ph) : null,
        parametrosCriticos,
        resultado: resultado || 'APROBADO',
        inspectorId: req.user.id,
        observaciones,
      }
    });

    // Si el control de producto terminado falla, cambiar estado del lote
    if (loteId && (resultado === 'RECHAZADO' || resultado === 'CUARENTENA')) {
      await this.prisma.lote.update({
        where: { id: loteId },
        data: { estado: resultado }
      });
    }

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_INSPECCION_CALIDAD',
        modulo: 'CALIDAD',
        detalles: JSON.stringify(control),
      },
    });

    return control;
  }

  // --- NO CONFORMIDADES ---
  @Get('no-conformidades')
  async listarNoConformidades() {
    return this.prisma.noConformidad.findMany({
      include: {
        responsable: true,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CALIDAD')
  @Post('no-conformidades')
  async crearNoConformidad(@Request() req: any, @Body() body: any) {
    const { tipo, referenciaId, descripcion, evidenciaUrl, responsableId } = body;

    if (!tipo || !descripcion || !responsableId) {
      throw new BadRequestException('El tipo, la descripción y el responsable son campos obligatorios.');
    }

    const nc = await this.prisma.noConformidad.create({
      data: {
        tipo,
        referenciaId,
        descripcion,
        evidenciaUrl, // Puede contener base64 o URL del Space
        responsableId,
        estado: 'REGISTRADA',
      }
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_NO_CONFORMIDAD',
        modulo: 'CALIDAD',
        detalles: JSON.stringify(nc),
      },
    });

    return nc;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'CALIDAD')
  @Put('no-conformidades/:id')
  async actualizarNoConformidad(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { estado, accionesCorrectivas } = body;

    const nc = await this.prisma.noConformidad.update({
      where: { id },
      data: {
        estado,
        accionesCorrectivas,
      }
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'RESOLVER_NO_CONFORMIDAD',
        modulo: 'CALIDAD',
        detalles: JSON.stringify(nc),
      },
    });

    return nc;
  }
}
