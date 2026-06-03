import { Controller, Get, Request } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('auditoria')
@Roles('ADMINISTRADOR', 'SUPERVISOR')
export class AuditoriaController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async obtenerBitacora() {
    return this.prisma.auditoria.findMany({
      include: {
        usuario: { select: { email: true, rol: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 200,
    });
  }
}
