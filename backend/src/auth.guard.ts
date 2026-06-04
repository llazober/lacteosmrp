import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación faltante o inválido.');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: 'CLAVE_SUPER_SECRETA_LA_VAQUITA', // En producción se usa variable de entorno
      });
      request.user = payload;

      // Verificar Roles si se requiere
      const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]);

      const className = context.getClass().name;
      const method = request.method;
      const isRead = method === 'GET';

      let requiredPermission = '';
      if (className === 'ProductosController') requiredPermission = isRead ? 'VER_PRODUCTOS' : 'GESTIONAR_PRODUCTOS';
      else if (className === 'SucursalesController') requiredPermission = isRead ? 'VER_SUCURSALES' : 'GESTIONAR_SUCURSALES';
      else if (className === 'ProduccionController') requiredPermission = isRead ? 'VER_PRODUCCION' : 'GESTIONAR_PRODUCCION';
      else if (className === 'PosController') requiredPermission = isRead ? 'VER_POS' : 'REALIZAR_VENTAS';
      else if (className === 'LotesController') requiredPermission = isRead ? 'VER_LOTES' : 'GESTIONAR_LOTES';
      else if (className === 'InventarioController') requiredPermission = isRead ? 'VER_INVENTARIO' : 'GESTIONAR_INVENTARIO';
      else if (className === 'FreezersController') requiredPermission = isRead ? 'VER_FRIO' : 'GESTIONAR_FRIO';
      else if (className === 'FinanzasController') requiredPermission = isRead ? 'VER_FINANZAS' : 'GESTIONAR_FINANZAS';
      else if (className === 'ComprasController') requiredPermission = isRead ? 'VER_COMPRAS' : 'GESTIONAR_COMPRAS';
      else if (className === 'CalidadController') requiredPermission = isRead ? 'VER_CALIDAD' : 'GESTIONAR_CALIDAD';
      else if (className === 'AuditoriaController') requiredPermission = 'VER_AUDITORIA';
      else if (className === 'ChatController') requiredPermission = 'VER_CHAT';
      else if (className === 'AiController') requiredPermission = 'USAR_ASISTENTE';
      else if (className === 'RolesController') requiredPermission = 'GESTIONAR_ROLES';

      let hasPermission = false;

      // Check if user has ADMINISTRADOR or SUPERVISOR (always allowed everything by default)
      if (payload.rol === 'ADMINISTRADOR' || payload.rol === 'SUPERVISOR') {
        hasPermission = true;
      } else if (requiredPermission) {
        // Query dynamic role from db
        const dbRole = await this.prisma.rol.findUnique({
          where: { nombre: payload.rol },
        });
        if (dbRole) {
          try {
            const list = JSON.parse(dbRole.permisos);
            if (Array.isArray(list) && list.includes(requiredPermission)) {
              hasPermission = true;
            }
          } catch (e) {
            hasPermission = false;
          }
        } else {
          // Fallback permissions check for standard roles
          if (payload.rol === 'ALMACEN') {
            const almacenPerms = [
              'VER_INVENTARIO', 'GESTIONAR_INVENTARIO', 'VER_PRODUCTOS', 'GESTIONAR_PRODUCTOS',
              'VER_LOTES', 'GESTIONAR_LOTES', 'VER_PRODUCCION', 'GESTIONAR_PRODUCCION', 'VER_COMPRAS',
              'GESTIONAR_COMPRAS', 'VER_CHAT', 'VER_UTILIDADES'
            ];
            hasPermission = almacenPerms.includes(requiredPermission);
          } else if (payload.rol === 'CAJERO') {
            const cajeroPerms = ['VER_POS', 'REALIZAR_VENTAS', 'VER_CHAT'];
            hasPermission = cajeroPerms.includes(requiredPermission);
          } else if (payload.rol === 'CONTROL_CALIDAD') {
            const calidadPerms = ['VER_CALIDAD', 'GESTIONAR_CALIDAD', 'VER_LOTES', 'VER_CHAT'];
            hasPermission = calidadPerms.includes(requiredPermission);
          }
        }
      } else {
        // If no permission defined, let it pass (rely on roles check or no check)
        hasPermission = true;
      }

      const hasRole = requiredRoles && requiredRoles.length > 0 ? requiredRoles.includes(payload.rol) : true;

      if (!hasPermission && !hasRole) {
        throw new ForbiddenException(
          `No tiene permisos suficientes para acceder a este recurso. Permiso requerido: ${requiredPermission || 'Ninguno'}`,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
