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
import { SocketGateway } from './socket.gateway';
import { Public, Roles } from './decorators';

@Controller('freezers')
export class FreezersController {
  constructor(
    private prisma: PrismaService,
    private socketGateway: SocketGateway,
  ) {}

  @Get()
  async listarFreezers(@Request() req: any) {
    const user = req.user;
    const sucursalId = user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR' ? null : user.sucursalId;

    const filter: any = {};
    if (sucursalId) {
      filter.sucursalId = sucursalId;
    }

    return this.prisma.freezer.findMany({
      where: filter,
      include: { sucursal: true },
      orderBy: { codigo: 'asc' },
    });
  }

  @Get(':id/lecturas')
  async listarLecturas(@Param('id') id: string) {
    return this.prisma.freezerLectura.findMany({
      where: { freezerId: id },
      orderBy: { fecha: 'desc' },
      take: 50,
    });
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post()
  async crearFreezer(@Request() req: any, @Body() body: any) {
    const { codigo, nombre, sucursalId, ubicacion, temperaturaMin, temperaturaMax } = body;

    if (!codigo || !nombre || !sucursalId || temperaturaMin == null || temperaturaMax == null) {
      throw new BadRequestException('Código, nombre, sucursal y temperaturas son obligatorios.');
    }

    const exist = await this.prisma.freezer.findUnique({ where: { codigo } });
    if (exist) {
      throw new BadRequestException('Ya existe un freezer con ese código.');
    }

    const freezer = await this.prisma.freezer.create({
      data: {
        codigo,
        nombre,
        sucursalId,
        ubicacion: ubicacion || '',
        temperaturaMin: parseFloat(temperaturaMin),
        temperaturaMax: parseFloat(temperaturaMax),
        estado: 'CONECTADO',
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_FREEZER',
        modulo: 'TELEMETRIA',
        detalles: JSON.stringify(freezer),
      },
    });

    return freezer;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Put(':id')
  async actualizarFreezer(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { codigo, nombre, sucursalId, ubicacion, temperaturaMin, temperaturaMax, estado } = body;

    if (!codigo || !nombre || !sucursalId || temperaturaMin == null || temperaturaMax == null) {
      throw new BadRequestException('Código, nombre, sucursal y temperaturas son obligatorios.');
    }

    const exist = await this.prisma.freezer.findFirst({
      where: {
        codigo,
        id: { not: id },
      },
    });
    if (exist) {
      throw new BadRequestException('Ya existe otro equipo con ese código.');
    }

    const freezer = await this.prisma.freezer.update({
      where: { id },
      data: {
        codigo,
        nombre,
        sucursalId,
        ubicacion: ubicacion || '',
        temperaturaMin: parseFloat(temperaturaMin),
        temperaturaMax: parseFloat(temperaturaMax),
        estado: estado || undefined,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_FREEZER',
        modulo: 'TELEMETRIA',
        detalles: JSON.stringify(freezer),
      },
    });

    return freezer;
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Delete(':id')
  async eliminarFreezer(@Param('id') id: string, @Request() req: any) {
    const freezer = await this.prisma.freezer.findUnique({ where: { id } });
    if (!freezer) {
      throw new BadRequestException('El equipo no existe.');
    }

    await this.prisma.$transaction([
      this.prisma.freezerLectura.deleteMany({ where: { freezerId: id } }),
      this.prisma.freezer.delete({ where: { id } }),
    ]);

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_FREEZER',
        modulo: 'TELEMETRIA',
        detalles: JSON.stringify(freezer),
      },
    });

    return { message: 'Equipo de frío eliminado con éxito.' };
  }

  // --- INGESTA DE DATOS DESDE IoT (ESP32, Shelly, Sonoff, o simulador web) ---
  @Public() // Los sensores IoT no usan sesión JWT estándar
  @Post('telemetria')
  async registrarTelemetria(@Body() body: any) {
    const { codigo, temperatura, humedad } = body;

    if (!codigo || temperatura == null) {
      throw new BadRequestException('El código del equipo y la temperatura son obligatorios.');
    }

    const tempNum = parseFloat(temperatura);
    const humNum = humedad != null ? parseFloat(humedad) : 50;

    // Buscar el freezer
    const freezer = await this.prisma.freezer.findUnique({
      where: { codigo },
      include: { sucursal: true },
    });

    if (!freezer) {
      throw new BadRequestException(`El equipo con código "${codigo}" no existe en el sistema.`);
    }

    // Verificar si la temperatura está fuera de rango
    let lecturaEstado = 'OK';
    let freezerEstado = 'CONECTADO';

    if (tempNum < freezer.temperaturaMin || tempNum > freezer.temperaturaMax) {
      lecturaEstado = 'CRITICO';
      freezerEstado = 'ALERTA';
    }

    // Iniciar transacción de guardado
    const [lectura, updatedFreezer] = await this.prisma.$transaction([
      this.prisma.freezerLectura.create({
        data: {
          freezerId: freezer.id,
          temperatura: tempNum,
          humedad: humNum,
          estado: lecturaEstado,
        },
      }),
      this.prisma.freezer.update({
        where: { id: freezer.id },
        data: { estado: freezerEstado },
      }),
    ]);

    // Emitir telemetría por WebSockets en tiempo real
    this.socketGateway.sendTelemetry(freezer.id, lectura);

    // Si está en alerta, crear una Alerta en base de datos si no existe una activa para este equipo
    if (freezerEstado === 'ALERTA') {
      const alertaExistente = await this.prisma.alerta.findFirst({
        where: {
          sucursalId: freezer.sucursalId,
          tipo: 'TEMPERATURA',
          mensaje: { contains: freezer.nombre },
          estado: 'ACTIVA',
        },
      });

      if (!alertaExistente) {
        const nuevaAlerta = await this.prisma.alerta.create({
          data: {
            sucursalId: freezer.sucursalId,
            tipo: 'TEMPERATURA',
            mensaje: `Fallo crítico de cadena de frío: El equipo "${freezer.nombre}" (${freezer.codigo}) registra ${tempNum} °C (Rango permitido: ${freezer.temperaturaMin} °C a ${freezer.temperaturaMax} °C).`,
            estado: 'ACTIVA',
          },
        });

        // Emitir alerta en tiempo real
        this.socketGateway.sendAlert(nuevaAlerta);
      }
    } else {
      // Si la temperatura volvió a la normalidad, resolver alertas activas automáticamente
      const alertasActivas = await this.prisma.alerta.findMany({
        where: {
          sucursalId: freezer.sucursalId,
          tipo: 'TEMPERATURA',
          mensaje: { contains: freezer.nombre },
          estado: 'ACTIVA',
        },
      });

      for (const alerta of alertasActivas) {
        const resolvedAlert = await this.prisma.alerta.update({
          where: { id: alerta.id },
          data: {
            estado: 'RESUELTA',
            notasAtencion: 'Resuelta automáticamente: Telemetría indica retorno a rango normal.',
          },
        });
        this.socketGateway.sendAlert(resolvedAlert); // Enviar estado actualizado
      }
    }

    return {
      message: 'Telemetría registrada.',
      lectura,
      freezerEstado,
    };
  }
}
