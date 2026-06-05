import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('alertas')
export class AlertasController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listarAlertas(@Request() req: any) {
    const user = req.user;
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }

    return this.prisma.alerta.findMany({
      where: filter,
      include: {
        sucursal: { select: { nombre: true } },
        atendidaPor: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR', 'GERENTE_TIENDA', 'CONTROL_CALIDAD')
  @Put(':id/resolver')
  async resolverAlerta(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const { notasAtencion } = body;
    if (!notasAtencion || notasAtencion.trim() === '') {
      throw new BadRequestException(
        'Debe ingresar notas de atención detallando la solución.',
      );
    }

    const alerta = await this.prisma.alerta.findUnique({ where: { id } });
    if (!alerta || alerta.estado !== 'ACTIVA') {
      throw new BadRequestException(
        'La alerta no existe o ya ha sido resuelta.',
      );
    }

    const updated = await this.prisma.alerta.update({
      where: { id },
      data: {
        estado: 'RESUELTA',
        atendidaPorId: req.user.id,
        notasAtencion,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'RESOLVER_ALERTA',
        modulo: 'TELEMETRIA',
        detalles: JSON.stringify({
          id,
          tipo: alerta.tipo,
          mensaje: alerta.mensaje,
          notasAtencion,
        }),
      },
    });

    return updated;
  }
}
