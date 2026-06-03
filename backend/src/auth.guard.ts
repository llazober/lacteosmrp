import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
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

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.includes(payload.rol);
        if (!hasRole) {
          throw new ForbiddenException(
            `No tiene permisos suficientes. Roles permitidos: ${requiredRoles.join(', ')}`,
          );
        }
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
