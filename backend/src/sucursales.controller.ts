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
import * as bcrypt from 'bcryptjs';

@Controller()
export class SucursalesController {
  constructor(private prisma: PrismaService) {}

  // --- SUCURSALES ---
  @Get('sucursales')
  async listarSucursales() {
    return this.prisma.sucursal.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR')
  @Post('sucursales')
  async crearSucursal(@Request() req: any, @Body() body: any) {
    const { codigo, nombre, direccion, telefono, correo } = body;
    if (!codigo || !nombre) {
      throw new BadRequestException('El código y el nombre son requeridos.');
    }

    const exist = await this.prisma.sucursal.findUnique({ where: { codigo } });
    if (exist) {
      throw new BadRequestException('Ya existe una sucursal con ese código.');
    }

    const sucursal = await this.prisma.sucursal.create({
      data: { codigo, nombre, direccion, telefono, correo },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_SUCURSAL',
        modulo: 'SUCURSALES',
        detalles: JSON.stringify(sucursal),
      },
    });

    return sucursal;
  }

  @Roles('ADMINISTRADOR')
  @Put('sucursales/:id')
  async actualizarSucursal(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { nombre, direccion, telefono, correo, estado } = body;

    const sucursal = await this.prisma.sucursal.update({
      where: { id },
      data: { nombre, direccion, telefono, correo, estado },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_SUCURSAL',
        modulo: 'SUCURSALES',
        detalles: JSON.stringify(sucursal),
      },
    });

    return sucursal;
  }

  @Roles('ADMINISTRADOR')
  @Delete('sucursales/:id')
  async eliminarSucursal(@Param('id') id: string, @Request() req: any) {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) {
      throw new BadRequestException('La sucursal no existe.');
    }

    const userCount = await this.prisma.usuario.count({ where: { sucursalId: id } });
    if (userCount > 0) {
      throw new BadRequestException('No se puede eliminar la sucursal porque tiene usuarios asociados.');
    }

    const invCount = await this.prisma.inventario.count({ where: { sucursalId: id } });
    if (invCount > 0) {
      throw new BadRequestException('No se puede eliminar la sucursal porque tiene productos en stock.');
    }

    const freezerCount = await this.prisma.freezer.count({ where: { sucursalId: id } });
    if (freezerCount > 0) {
      throw new BadRequestException('No se puede eliminar la sucursal porque tiene equipos de frío asociados.');
    }

    await this.prisma.sucursal.delete({ where: { id } });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ELIMINAR_SUCURSAL',
        modulo: 'SUCURSALES',
        detalles: JSON.stringify(sucursal),
      },
    });

    return { message: 'Sucursal eliminada con éxito.' };
  }

  // --- USUARIOS Y ROLES ---
  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Get('usuarios')
  async listarUsuarios() {
    return this.prisma.usuario.findMany({
      include: { sucursal: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Roles('ADMINISTRADOR')
  @Post('usuarios')
  async crearUsuario(@Request() req: any, @Body() body: any) {
    const { email, password, nombre, rol, sucursalId } = body;
    if (!email || !password || !nombre || !rol) {
      throw new BadRequestException('Correo, contraseña, nombre y rol son obligatorios.');
    }

    const exist = await this.prisma.usuario.findUnique({ where: { email } });
    if (exist) {
      throw new BadRequestException('Ya existe un usuario con este correo electrónico.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        password: passwordHash,
        nombre,
        rol,
        sucursalId: sucursalId || null,
      },
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'CREAR_USUARIO',
        modulo: 'AUTH',
        detalles: JSON.stringify({ id: usuario.id, email: usuario.email, rol: usuario.rol }),
      },
    });

    return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol };
  }

  @Roles('ADMINISTRADOR')
  @Put('usuarios/:id')
  async actualizarUsuario(@Param('id') id: string, @Request() req: any, @Body() body: any) {
    const { nombre, rol, sucursalId, estado, password } = body;

    const dataUpdate: any = { nombre, rol, sucursalId: sucursalId || null, estado };

    if (password && password.trim() !== '') {
      const salt = bcrypt.genSaltSync(10);
      dataUpdate.password = bcrypt.hashSync(password, salt);
    }

    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: dataUpdate,
    });

    // Auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'ACTUALIZAR_USUARIO',
        modulo: 'AUTH',
        detalles: JSON.stringify({ id: usuario.id, email: usuario.email, rol: usuario.rol, estado: usuario.estado }),
      },
    });

    return { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, estado: usuario.estado };
  }
}
