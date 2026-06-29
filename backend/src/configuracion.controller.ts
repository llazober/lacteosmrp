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
      'email_provider',
      'resend_api_key',
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
      'email_departamento_contabilidad',
    ];

    const configs = await this.prisma.configuracion.findMany({
      where: { clave: { in: keys } },
    });

    const configMap = new Map(configs.map((c) => [c.clave, c.valor]));

    return {
      email_provider: configMap.get('email_provider') || 'resend',
      resend_api_key: configMap.get('resend_api_key') || '',
      smtp_host: configMap.get('smtp_host') || 'smtp.gmail.com',
      smtp_port: configMap.get('smtp_port') || '465',
      smtp_user: configMap.get('smtp_user') || '',
      smtp_pass: configMap.get('smtp_pass') || '',
      smtp_from: configMap.get('smtp_from') || 'onboarding@resend.dev',
      smtp_secure: configMap.get('smtp_secure') || 'true',
      email_departamento_calidad: configMap.get('email_departamento_calidad') || '',
      email_departamento_compras: configMap.get('email_departamento_compras') || '',
      email_departamento_produccion: configMap.get('email_departamento_produccion') || '',
      email_departamento_almacen: configMap.get('email_departamento_almacen') || '',
      email_departamento_contabilidad: configMap.get('email_departamento_contabilidad') || '',
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('email-settings')
  async saveEmailSettings(@Request() req: any, @Body() body: any) {
    const keys = [
      'email_provider',
      'resend_api_key',
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
      'email_departamento_contabilidad',
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
    const { smtpConfig, destinatario, provider, resendApiKey } = body;
    if (!destinatario) {
      throw new BadRequestException('El correo del destinatario es obligatorio.');
    }

    try {
      if (provider === 'resend') {
        const apiKey = resendApiKey || smtpConfig?.pass;
        const from = smtpConfig?.from || 'onboarding@resend.dev';
        if (!apiKey) {
          throw new BadRequestException('La API Key de Resend es obligatoria.');
        }

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from,
            to: [destinatario],
            subject: 'Prueba de Conexión - Resend API',
            html: '<p>Tu integración con <b>Resend API</b> en Lácteos ERP está activa y funcionando.</p>',
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Error al enviar por Resend API.');
        }
        return { message: `Correo de prueba enviado con éxito a ${destinatario} usando Resend API` };
      } else {
        await this.emailService.probarSMTP(smtpConfig, destinatario);
        return { message: `Correo de prueba enviado con éxito a ${destinatario} usando SMTP` };
      }
    } catch (e: any) {
      throw new BadRequestException(`Fallo al enviar correo de prueba: ${e.message}`);
    }
  }
}
