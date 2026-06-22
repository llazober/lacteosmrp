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
    const roles = await this.prisma.rol.findMany({
      orderBy: { nombre: 'asc' },
    });

    if (roles.length === 0) {
      const rolesDefault = [
        {
          nombre: 'ADMINISTRADOR',
          descripcion: 'Administrador global del sistema con acceso total',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_POS',
            'REALIZAR_VENTAS',
            'VER_VENTAS',
            'VER_FRIO',
            'VER_TRAZABILIDAD',
            'VER_INVENTARIO',
            'GESTIONAR_INVENTARIO',
            'VER_PRODUCCION',
            'GESTIONAR_PRODUCCION',
            'VER_PLANIFICACION_PRODUCCION',
            'GESTIONAR_PLANIFICACION_PRODUCCION',
            'VER_RUTA_OPERACIONES',
            'GESTIONAR_RUTA_OPERACIONES',
            'VER_CALIDAD',
            'GESTIONAR_CALIDAD',
            'VER_COMPRAS',
            'GESTIONAR_COMPRAS',
            'VER_FINANZAS',
            'GESTIONAR_FINANZAS',
            'VER_AUDITORIA',
            'VER_CHAT',
            'USAR_ASISTENTE',
            'VER_UTILIDADES',
            'GESTIONAR_ROLES',
            'VER_SUCURSALES',
            'GESTIONAR_SUCURSALES',
            'VER_PRODUCTOS',
            'GESTIONAR_PRODUCTOS',
            'VER_LOTES',
            'GESTIONAR_LOTES',
            'VER_TRASLADO_INTERSUCURSALES',
          ]),
        },
        {
          nombre: 'SUPERVISOR',
          descripcion:
            'Supervisor general con capacidad de ver y editar configuraciones operativas',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_POS',
            'REALIZAR_VENTAS',
            'VER_VENTAS',
            'VER_FRIO',
            'VER_TRAZABILIDAD',
            'VER_INVENTARIO',
            'GESTIONAR_INVENTARIO',
            'VER_PRODUCCION',
            'GESTIONAR_PRODUCCION',
            'VER_PLANIFICACION_PRODUCCION',
            'GESTIONAR_PLANIFICACION_PRODUCCION',
            'VER_RUTA_OPERACIONES',
            'GESTIONAR_RUTA_OPERACIONES',
            'VER_CALIDAD',
            'GESTIONAR_CALIDAD',
            'VER_COMPRAS',
            'GESTIONAR_COMPRAS',
            'VER_FINANZAS',
            'GESTIONAR_FINANZAS',
            'VER_AUDITORIA',
            'VER_CHAT',
            'USAR_ASISTENTE',
            'VER_UTILIDADES',
            'GESTIONAR_ROLES',
            'VER_SUCURSALES',
            'GESTIONAR_SUCURSALES',
            'VER_PRODUCTOS',
            'GESTIONAR_PRODUCTOS',
            'VER_LOTES',
            'GESTIONAR_LOTES',
            'VER_TRASLADO_INTERSUCURSALES',
          ]),
        },
        {
          nombre: 'GERENTE_TIENDA',
          descripcion: 'Gerente encargado de la operación de una sucursal',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_POS',
            'REALIZAR_VENTAS',
            'VER_VENTAS',
            'VER_FRIO',
            'VER_TRAZABILIDAD',
            'VER_INVENTARIO',
            'GESTIONAR_INVENTARIO',
            'VER_COMPRAS',
            'VER_CHAT',
            'USAR_ASISTENTE',
            'VER_UTILIDADES',
            'VER_PRODUCTOS',
            'VER_LOTES',
            'VER_TRASLADO_INTERSUCURSALES',
          ]),
        },
        {
          nombre: 'CAJERO',
          descripcion: 'Operador de caja y punto de venta',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_POS',
            'REALIZAR_VENTAS',
            'VER_CHAT',
          ]),
        },
        {
          nombre: 'ALMACEN',
          descripcion:
            'Gestor de stock, materias primas y órdenes de producción',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_INVENTARIO',
            'GESTIONAR_INVENTARIO',
            'VER_PRODUCTOS',
            'GESTIONAR_PRODUCTOS',
            'VER_LOTES',
            'GESTIONAR_LOTES',
            'VER_PRODUCCION',
            'GESTIONAR_PRODUCCION',
            'VER_PLANIFICACION_PRODUCCION',
            'GESTIONAR_PLANIFICACION_PRODUCCION',
            'VER_RUTA_OPERACIONES',
            'GESTIONAR_RUTA_OPERACIONES',
            'VER_COMPRAS',
            'GESTIONAR_COMPRAS',
            'VER_CHAT',
            'VER_UTILIDADES',
            'VER_TRASLADO_INTERSUCURSALES',
          ]),
        },
        {
          nombre: 'CONTROL_CALIDAD',
          descripcion:
            'Inspector de calidad y aseguramiento higiénico-sanitario',
          permisos: JSON.stringify([
            'VER_DASHBOARD',
            'VER_CALIDAD',
            'GESTIONAR_CALIDAD',
            'VER_LOTES',
            'VER_CHAT',
          ]),
        },
      ];

      for (const r of rolesDefault) {
        await this.prisma.rol.create({ data: r });
      }

      return this.prisma.rol.findMany({
        orderBy: { nombre: 'asc' },
      });
    }

    return roles;
  }

  @Roles('ADMINISTRADOR')
  @Post()
  async crearRol(@Request() req: any, @Body() body: any) {
    const { nombre, descripcion, permisos } = body;
    if (!nombre || !descripcion) {
      throw new BadRequestException(
        'El nombre y la descripción son obligatorios.',
      );
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
      throw new BadRequestException(
        'El nombre y la descripción son obligatorios.',
      );
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
