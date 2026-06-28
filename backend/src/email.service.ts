import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private prisma: PrismaService) {}

  private async getTransporter() {
    const configs = await this.prisma.configuracion.findMany({
      where: {
        clave: {
          in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'smtp_secure'],
        },
      },
    });

    const configMap = new Map(configs.map((c) => [c.clave, c.valor]));

    const host = configMap.get('smtp_host') || 'mail.privateemail.com';
    const port = Number(configMap.get('smtp_port')) || 465;
    const user = configMap.get('smtp_user') || 'luislazo@datalazo.net';
    const pass = configMap.get('smtp_pass') || 'Rambo20224$';
    const secureStr = configMap.get('smtp_secure');
    const secure = secureStr !== undefined ? secureStr === 'true' : port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    const from = configMap.get('smtp_from') || `"Lácteos ERP" <${user}>`;

    return { transporter, from };
  }

  async enviarCorreo(para: string, asunto: string, html: string) {
    try {
      const { transporter, from } = await this.getTransporter();
      await transporter.sendMail({
        from,
        to: para,
        subject: asunto,
        html,
      });
      this.logger.log(`Correo enviado exitosamente a ${para}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${para}:`, error);
      throw error;
    }
  }

  async probarSMTP(smtpConfig: any, destinatario: string) {
    const host = smtpConfig.host || 'mail.privateemail.com';
    const port = Number(smtpConfig.port) || 465;
    const user = smtpConfig.user || 'luislazo@datalazo.net';
    const pass = smtpConfig.pass || 'Rambo20224$';
    const secure = smtpConfig.secure !== undefined ? smtpConfig.secure === true : port === 465;
    const from = smtpConfig.from || `"Lácteos ERP" <${user}>`;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: destinatario,
      subject: 'Prueba de Conexión SMTP - Lácteos ERP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0b0f19; color: #fff; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-bottom: 10px;">¡Conexión Exitosa!</h2>
          <p>Este es un correo de prueba enviado por <strong>Lácteos ERP</strong> para confirmar que la configuración del servidor SMTP está funcionando correctamente.</p>
          <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
          <p style="font-size: 12px; color: #888;">Servidor SMTP configurado: <strong>${host}:${port}</strong></p>
          <p style="font-size: 12px; color: #888;">Usuario SMTP: <strong>${user}</strong></p>
        </div>
      `,
    });
  }
}
