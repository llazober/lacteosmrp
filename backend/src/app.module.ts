import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { SocketGateway } from './socket.gateway';
import { AuthGuard } from './auth.guard';

// Controladores
import { AuthController } from './auth.controller';
import { SucursalesController } from './sucursales.controller';
import { ProductosController } from './productos.controller';
import { LotesController } from './lotes.controller';
import { InventarioController } from './inventario.controller';
import { ComprasController } from './compras.controller';
import { PosController } from './pos.controller';
import { FreezersController } from './freezers.controller';
import { AlertasController } from './alertas.controller';
import { AuditoriaController } from './auditoria.controller';
import { ChatController } from './chat.controller';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FinanzasController } from './finanzas.controller';
import { ProduccionController } from './produccion.controller';
import { CalidadController } from './calidad.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'CLAVE_SUPER_SECRETA_LA_VAQUITA',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    SucursalesController,
    ProductosController,
    LotesController,
    InventarioController,
    ComprasController,
    PosController,
    FreezersController,
    AlertasController,
    AuditoriaController,
    ChatController,
    AiController,
    FinanzasController,
    ProduccionController,
    CalidadController,
  ],
  providers: [
    AppService,
    PrismaService,
    SocketGateway,
    AiService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
