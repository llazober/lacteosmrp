import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { Public } from './decorators';
import * as bcrypt from 'bcryptjs';
import { getTimezoneOffsetMinutes } from './utils/timezone';

@Controller('auth')
export class AuthController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    const { email, password } = body;
    if (!email || !password) {
      throw new BadRequestException(
        'El correo y la contraseña son requeridos.',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: { sucursal: true },
    });

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo.');
    }

    const isMatch = bcrypt.compareSync(password, usuario.password);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta.');
    }

    const token = await this.jwtService.signAsync(
      {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        sucursalId: usuario.sucursalId,
      },
      {
        secret: 'CLAVE_SUPER_SECRETA_LA_VAQUITA',
        expiresIn: '12h',
      },
    );

    // Registro de auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        accion: 'LOGIN',
        modulo: 'AUTH',
        detalles: JSON.stringify({ ip: '127.0.0.1', email: usuario.email }),
      },
    });

    const permisos = await this.obtenerPermisosPorRol(usuario.rol);

    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        sucursalId: usuario.sucursalId,
        sucursalNombre: usuario.sucursal?.nombre || 'Todas',
        permisos,
      },
    };
  }

  @Public()
  @Get('system-timezone')
  async getSystemTimezone() {
    const config = await this.prisma.configuracion.findUnique({
      where: { clave: 'system_timezone' },
    });
    return { timezone: config?.valor || 'America/El_Salvador' };
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    const user = req.user;
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      include: { sucursal: true },
    });
    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado.');
    }
    const permisos = await this.obtenerPermisosPorRol(usuario.rol);

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      sucursalId: usuario.sucursalId,
      sucursalNombre: usuario.sucursal?.nombre || 'Todas',
      permisos,
    };
  }

  @Post('change-password')
  async changePassword(@Request() req: any, @Body() body: any) {
    const user = req.user;
    const { oldPassword, newPassword } = body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestException(
        'Contraseñas antigua y nueva son requeridas.',
      );
    }

    const dbUser = await this.prisma.usuario.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new BadRequestException('Usuario no existe.');
    }

    const isMatch = bcrypt.compareSync(oldPassword, dbUser.password);
    if (!isMatch) {
      throw new BadRequestException('La contraseña antigua es incorrecta.');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    await this.prisma.auditoria.create({
      data: {
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'CAMBIAR_PASSWORD',
        modulo: 'AUTH',
        detalles: JSON.stringify({ email: user.email }),
      },
    });

    return { message: 'Contraseña cambiada exitosamente.' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    const { email } = body;
    if (!email) {
      throw new BadRequestException('El correo electrónico es requerido.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      throw new BadRequestException(
        'No se encontró ningún usuario con ese correo electrónico.',
      );
    }

    // Restablecer contraseña a la contraseña por defecto: lavaquita123
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('lavaquita123', salt);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { password: passwordHash },
    });

    // Registro en auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: usuario.id,
        usuarioNombre: usuario.nombre,
        accion: 'RECUPERAR_PASSWORD',
        modulo: 'AUTH',
        detalles: JSON.stringify({ email: usuario.email }),
      },
    });

    return {
      message:
        'Su contraseña ha sido restablecida a la contraseña por defecto: lavaquita123. Por seguridad, por favor inicie sesión y cámbiela de inmediato.',
    };
  }

  @Get('dashboard-metrics')
  async getDashboardMetrics(@Request() req: any) {
    const user = req.user;
    // Si el usuario tiene sucursal asignada (cajero, gerente, etc), filtramos por su sucursal,
    // de lo contrario (admin, supervisor) ve global.
    const sucursalId =
      user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR'
        ? null
        : user.sucursalId;

    const queryFilter: any = {};
    if (sucursalId) {
      queryFilter.sucursalId = sucursalId;
    }

    // 1. Ventas Totales (Hoy, Semana, Mes)
    const { offsetMinutes: tzOffset } = await getTimezoneOffsetMinutes(
      this.prisma,
    );

    // Today in local timezone context
    const localToday = new Date(new Date().getTime() + tzOffset * 60 * 1000);
    localToday.setUTCHours(0, 0, 0, 0);
    const hoy = new Date(localToday.getTime() - tzOffset * 60 * 1000);

    // Start of week in local timezone context (Sunday)
    const localWeek = new Date(localToday);
    localWeek.setDate(localToday.getDate() - localToday.getDay());
    const inicioSemana = new Date(localWeek.getTime() - tzOffset * 60 * 1000);

    // Start of month in local timezone context (1st of month)
    const localMonth = new Date(
      localToday.getFullYear(),
      localToday.getMonth(),
      1,
    );
    const inicioMes = new Date(localMonth.getTime() - tzOffset * 60 * 1000);

    const ventasHoy = await this.prisma.venta.aggregate({
      where: {
        ...queryFilter,
        fecha: { gte: hoy },
      },
      _sum: { total: true },
      _count: true,
    });

    const ventasSemana = await this.prisma.venta.aggregate({
      where: {
        ...queryFilter,
        fecha: { gte: inicioSemana },
      },
      _sum: { total: true },
    });

    const ventasMes = await this.prisma.venta.aggregate({
      where: {
        ...queryFilter,
        fecha: { gte: inicioMes },
      },
      _sum: { total: true },
    });

    // 2. Valor del Inventario
    // Suma de (inventario.existencia * producto.costo)
    const inventarios = await this.prisma.inventario.findMany({
      where: queryFilter,
      include: { producto: true },
    });
    let valorInventarioTotal = 0;
    let productosCriticos = 0;

    for (const inv of inventarios) {
      valorInventarioTotal += inv.existencia * inv.producto.costo;
      if (inv.existencia < inv.existMin) {
        productosCriticos++;
      }
    }

    // 3. Cadena de Frío
    const freezers = await this.prisma.freezer.findMany({
      where: queryFilter,
    });
    const freezersFueraRango = freezers.filter(
      (f) => f.estado === 'ALERTA' || f.estado === 'DESCONECTADO',
    ).length;

    const alertasActivas = await this.prisma.alerta.count({
      where: {
        ...queryFilter,
        estado: 'ACTIVA',
        tipo: { in: ['TEMPERATURA', 'FREEZER_DESCONECTADO'] },
      },
    });

    const alertasList = await this.prisma.alerta.findMany({
      where: {
        ...queryFilter,
        estado: 'ACTIVA',
        tipo: { in: ['TEMPERATURA', 'FREEZER_DESCONECTADO'] },
      },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    // 4. Compras pendientes
    const comprasPendientes = await this.prisma.ordenCompra.count({
      where: {
        ...queryFilter,
        estado: { in: ['PENDIENTE', 'APROBADA'] },
      },
    });

    // 5. Historial de Ventas Semanal para gráfico (Últimos 7 días)
    const salesChartData: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const diaInicio = new Date();
      diaInicio.setDate(diaInicio.getDate() - i);
      diaInicio.setHours(0, 0, 0, 0);

      const diaFin = new Date(diaInicio);
      diaFin.setHours(23, 59, 59, 999);

      const queryDayFilter: any = { fecha: { gte: diaInicio, lte: diaFin } };
      if (sucursalId) {
        queryDayFilter.sucursalId = sucursalId;
      }

      const sumVentas = await this.prisma.venta.aggregate({
        where: queryDayFilter,
        _sum: { total: true },
      });

      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      salesChartData.push({
        name: diasSemana[diaInicio.getDay()],
        ventas: sumVentas._sum.total || 0,
      });
    }

    // 6. Productos próximos a vencer (Próximos 7 días)
    const en7Dias = new Date();
    en7Dias.setDate(en7Dias.getDate() + 7);

    // Lotes próximos a vencer
    const lotesProxVencer = await this.prisma.lote.findMany({
      where: {
        fechaVencimiento: { gte: new Date(), lte: en7Dias },
        cantidadActual: { gt: 0 },
        estado: { not: 'VENCIDO' },
      },
      include: { producto: true },
      take: 5,
      orderBy: { fechaVencimiento: 'asc' },
    });

    return {
      ventas: {
        hoy: ventasHoy._sum.total || 0,
        hoyCantidad: ventasHoy._count || 0,
        semana: ventasSemana._sum.total || 0,
        mes: ventasMes._sum.total || 0,
      },
      inventario: {
        valorTotal: valorInventarioTotal,
        productosCriticos,
        totalItems: inventarios.length,
      },
      frio: {
        alertasActivas,
        alertasList,
        freezersFueraRango,
        totalFreezers: freezers.length,
      },
      compras: {
        ordenesPendientes: comprasPendientes,
      },
      salesChartData,
      lotesProxVencer: lotesProxVencer.map((l) => ({
        sku: l.producto.sku,
        descripcion: l.producto.descripcion,
        lote: l.numeroLote,
        fechaVencimiento: l.fechaVencimiento,
        cantidad: l.cantidadActual,
        diasRestantes: Math.ceil(
          (l.fechaVencimiento.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      })),
    };
  }

  @Get('dashboard-consolidado')
  async getDashboardConsolidado(@Request() req: any) {
    const user = req.user;
    if (user.rol !== 'ADMINISTRADOR' && user.rol !== 'SUPERVISOR') {
      throw new BadRequestException('Acceso no autorizado.');
    }

    const sucursales = await this.prisma.sucursal.findMany({
      orderBy: { nombre: 'asc' },
    });

    const { offsetMinutes: tzOffset } = await getTimezoneOffsetMinutes(
      this.prisma,
    );
    const localToday = new Date(new Date().getTime() + tzOffset * 60 * 1000);
    localToday.setUTCHours(0, 0, 0, 0);
    const hoy = new Date(localToday.getTime() - tzOffset * 60 * 1000);

    const consolidado: any[] = [];

    for (const suc of sucursales) {
      // 1. Ventas de hoy
      const ventasHoy = await this.prisma.venta.aggregate({
        where: {
          sucursalId: suc.id,
          fecha: { gte: hoy },
        },
        _sum: { total: true },
        _count: true,
      });

      // 2. Valor del inventario
      const inventarios = await this.prisma.inventario.findMany({
        where: { sucursalId: suc.id },
        include: { producto: true },
      });
      let valorInventario = 0;
      let productosCriticos = 0;
      for (const inv of inventarios) {
        valorInventario += inv.existencia * inv.producto.costo;
        if (inv.existencia < inv.existMin) {
          productosCriticos++;
        }
      }

      // 3. Cadena de frío
      const freezers = await this.prisma.freezer.findMany({
        where: { sucursalId: suc.id },
      });
      const freezersFueraRango = freezers.filter(
        (f) => f.estado === 'ALERTA' || f.estado === 'DESCONECTADO',
      ).length;

      // 4. Alertas activas de la sucursal
      const alertasActivas = await this.prisma.alerta.count({
        where: {
          sucursalId: suc.id,
          estado: 'ACTIVA',
        },
      });

      // 5. Compras pendientes
      const comprasPendientes = await this.prisma.ordenCompra.count({
        where: {
          sucursalId: suc.id,
          estado: { in: ['PENDIENTE', 'APROBADA'] },
        },
      });

      consolidado.push({
        sucursal: {
          id: suc.id,
          codigo: suc.codigo,
          nombre: suc.nombre,
          direccion: suc.direccion,
        },
        ventas: {
          hoy: ventasHoy._sum.total || 0,
          hoyCantidad: ventasHoy._count || 0,
        },
        inventario: {
          valorTotal: valorInventario,
          productosCriticos,
          totalItems: inventarios.length,
        },
        frio: {
          totalFreezers: freezers.length,
          freezersFueraRango,
          alertasActivas,
        },
        compras: {
          ordenesPendientes: comprasPendientes,
        },
      });
    }

    return consolidado;
  }

  private async obtenerPermisosPorRol(rolNombre: string): Promise<string[]> {
    const dbRole = await this.prisma.rol.findUnique({
      where: { nombre: rolNombre },
    });
    if (dbRole) {
      try {
        return JSON.parse(dbRole.permisos);
      } catch (e) {
        return [];
      }
    }
    // Fallback permissions based on standard roles
    if (rolNombre === 'ADMINISTRADOR' || rolNombre === 'SUPERVISOR') {
      return [
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
      ];
    } else if (rolNombre === 'ALMACEN') {
      return [
        'VER_DASHBOARD',
        'VER_INVENTARIO',
        'GESTIONAR_INVENTARIO',
        'VER_PRODUCTOS',
        'GESTIONAR_PRODUCTOS',
        'VER_LOTES',
        'GESTIONAR_LOTES',
        'VER_PRODUCCION',
        'GESTIONAR_PRODUCCION',
        'VER_COMPRAS',
        'GESTIONAR_COMPRAS',
        'VER_CHAT',
        'VER_UTILIDADES',
      ];
    } else if (rolNombre === 'CAJERO') {
      return ['VER_DASHBOARD', 'VER_POS', 'REALIZAR_VENTAS', 'VER_CHAT'];
    } else if (rolNombre === 'CONTROL_CALIDAD') {
      return [
        'VER_DASHBOARD',
        'VER_CALIDAD',
        'GESTIONAR_CALIDAD',
        'VER_LOTES',
        'VER_CHAT',
      ];
    }
    return [];
  }
}
