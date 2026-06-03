import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SocketGateway } from './socket.gateway';

@Controller('chat')
export class ChatController {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  @Get('mensajes')
  async listarMensajes(@Query('canalId') canalId: string, @Request() req: any) {
    const user = req.user;

    if (!canalId) {
      throw new BadRequestException('El identificador del canal (canalId) es requerido.');
    }

    // Restricciones de acceso:
    // Los cajeros o encargados de almacén solo pueden ver '#general' o el canal de su propia sucursal.
    if (canalId !== 'general' && user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') {
      if (user.sucursalId !== canalId) {
        throw new BadRequestException('No tiene permisos para acceder a este canal de chat.');
      }
    }

    const whereFilter: any = {};
    if (canalId === 'general') {
      whereFilter.sucursalId = null;
    } else {
      whereFilter.sucursalId = canalId;
    }

    return this.prisma.chatMensaje.findMany({
      where: whereFilter,
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            rol: true,
            sucursal: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        fecha: 'asc',
      },
      take: 100, // Limitar a las últimas 100 interacciones para optimizar rendimiento
    });
  }

  @Post('mensajes')
  async enviarMensaje(@Request() req: any, @Body() body: any) {
    const user = req.user;
    const { contenido, canalId } = body; // canalId es 'general' o sucursalId

    if (!canalId) {
      throw new BadRequestException('El identificador del canal (canalId) es requerido.');
    }

    if (!contenido || contenido.trim() === '') {
      throw new BadRequestException('El contenido del mensaje no puede estar vacío.');
    }

    // Restricción de escritura:
    if (canalId !== 'general' && user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') {
      if (user.sucursalId !== canalId) {
        throw new BadRequestException('No tiene permisos para enviar mensajes en este canal.');
      }
    }

    const dbSucursalId = canalId === 'general' ? null : canalId;

    const mensaje = await this.prisma.chatMensaje.create({
      data: {
        contenido,
        usuarioId: user.id,
        sucursalId: dbSucursalId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            rol: true,
            sucursal: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    });

    // Enviar a través de SocketGateway en tiempo real
    this.socketGateway.sendChatMessage(canalId, mensaje);

    // Registrar en auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'ENVIAR_MENSAJE_CHAT',
        modulo: 'AUTH',
        detalles: JSON.stringify({ canalId, mensajeId: mensaje.id }),
      },
    });

    return mensaje;
  }
}
