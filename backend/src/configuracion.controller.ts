import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { Roles } from './decorators';

@Controller('configuracion')
export class ConfiguracionController {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Get('email-settings')
  async getEmailSettings() {
    const keys = [
      'smtp_host',
      'smtp_port',
      'smtp_user',
      'smtp_pass',
      'smtp_from',
      'smtp_secure',
      'email_departamento_calidad',
      'email_departamento_compras',
      'email_departamento_produccion',
      'email_departamento_almacen',
    ];

    const configs = await this.prisma.configuracion.findMany({
      where: { clave: { in: keys } },
    });

    const configMap = new Map(configs.map((c) => [c.clave, c.valor]));

    return {
      smtp_host: configMap.get('smtp_host') || 'mail.privateemail.com',
      smtp_port: configMap.get('smtp_port') || '465',
      smtp_user: configMap.get('smtp_user') || 'luislazo@datalazo.net',
      smtp_pass: configMap.get('smtp_pass') || 'Rambo20224$',
      smtp_from: configMap.get('smtp_from') || '"Lácteos ERP" <luislazo@datalazo.net>',
      smtp_secure: configMap.get('smtp_secure') || 'true',
      email_departamento_calidad: configMap.get('email_departamento_calidad') || 'luislazo@datalazo.net',
      email_departamento_compras: configMap.get('email_departamento_compras') || 'luislazo@datalazo.net',
      email_departamento_produccion: configMap.get('email_departamento_produccion') || 'luislazo@datalazo.net',
      email_departamento_almacen: configMap.get('email_departamento_almacen') || 'luislazo@datalazo.net',
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('email-settings')
  async saveEmailSettings(@Request() req: any, @Body() body: any) {
    const keys = [
      'smtp_host',
      'smtp_port',
      'smtp_user',
      'smtp_pass',
      'smtp_from',
      'smtp_secure',
      'email_departamento_calidad',
      'email_departamento_compras',
      'email_departamento_produccion',
      'email_departamento_almacen',
    ];

    for (const key of keys) {
      if (body[key] !== undefined) {
        await this.prisma.configuracion.upsert({
          where: { clave: key },
          update: { valor: String(body[key]) },
          create: { clave: key, valor: String(body[key]) },
        });
      }
    }

    // Registrar auditoría
    await this.prisma.auditoria.create({
      data: {
        usuarioId: req.user.id,
        usuarioNombre: req.user.nombre,
        accion: 'GUARDAR_CONFIG_EMAIL',
        modulo: 'TELEMETRIA',
        detalles: JSON.stringify({ updatedKeys: Object.keys(body).filter(k => keys.includes(k)) }),
      },
    });

    return { message: 'Configuración de correo guardada con éxito.' };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('test-smtp')
  async testSmtp(@Body() body: any) {
    const { smtpConfig, destinatario } = body;
    if (!destinatario) {
      throw new BadRequestException('El correo del destinatario es obligatorio.');
    }

    try {
      await this.emailService.probarSMTP(smtpConfig, destinatario);
      return { message: `Correo de prueba enviado con éxito a ${destinatario}` };
    } catch (e: any) {
      throw new BadRequestException(`Fallo al enviar correo de prueba: ${e.message}`);
    }
  }
}
