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
import { Roles } from './decorators';

@Controller('roles')
export class RolesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async listarRoles() {
    return this.prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR')
  @Post()
  async crearRol(@Request() req: any, @Body() body: any) {
    const { nombre, descripcion, permisos } = body;
    if (!nombre || !descripcion) {
      throw new BadRequestException('El nombre y la descripción son obligatorios.');
    }

    const exist = await this.prisma.rol.findUnique({
      where: { nombre: nombre.toUpperCase() },
    });
    if (exist) {
      throw new BadRequestException('Ya existe un rol con ese nombre.');
    }

    const stringifiedPermisos = Array.isArray(permisos)
      ? JSON.stringify(permisos)
      : '[]';

    const nuevoRol = await this.prisma.rol.create({
      data: {
        nombre: nombre.toUpperCase(),
        descripcion,
        permisos: stringifiedPermisos,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_ROL',
        modulo: 'ROLES',
        detalles: JSON.stringify({ rol: nuevoRol.nombre, permisos }),
      },
    });

    return nuevoRol;
  }

  @Roles('ADMINISTRADOR')
  @Put(':id')
  async actualizarRol(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const { nombre, descripcion, permisos } = body;
    if (!nombre || !descripcion) {
      throw new BadRequestException('El nombre y la descripción son obligatorios.');
    }

    const rolExistente = await this.prisma.rol.findUnique({ where: { id } });
    if (!rolExistente) {
      throw new BadRequestException('El rol no existe.');
    }

    // Si cambia el nombre del rol, verificar unicidad
    if (nombre.toUpperCase() !== rolExistente.nombre) {
      const exist = await this.prisma.rol.findUnique({
        where: { nombre: nombre.toUpperCase() },
      });
      if (exist) {
        throw new BadRequestException('Ya existe otro rol con ese nombre.');
      }
    }

    const stringifiedPermisos = Array.isArray(permisos)
      ? JSON.stringify(permisos)
      : '[]';

    const rolActualizado = await this.prisma.rol.update({
      where: { id },
      data: {
        nombre: nombre.toUpperCase(),
        descripcion,
        permisos: stringifiedPermisos,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_ROL',
        modulo: 'ROLES',
        detalles: JSON.stringify({ rol: rolActualizado.nombre, permisos }),
      },
    });

    return rolActualizado;
  }

  @Roles('ADMINISTRADOR')
  @Delete(':id')
  async eliminarRol(@Request() req: any, @Param('id') id: string) {
    const rolExistente = await this.prisma.rol.findUnique({ where: { id } });
    if (!rolExistente) {
      throw new BadRequestException('El rol no existe.');
    }

    // No permitir borrar roles por defecto del sistema
    const defaultRoles = [
      'ADMINISTRADOR',
      'SUPERVISOR',
      'GERENTE_TIENDA',
      'CAJERO',
      'ALMACEN',
      'CONTROL_CALIDAD',
    ];
    if (defaultRoles.includes(rolExistente.nombre)) {
      throw new BadRequestException(
        'No se pueden eliminar los roles preestablecidos del sistema.',
      );
    }

    await this.prisma.rol.delete({ where: { id } });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_ROL',
        modulo: 'ROLES',
        detalles: JSON.stringify({ rol: rolExistente.nombre }),
      },
    });

    return { message: 'Rol eliminado con éxito.' };
  }
}
