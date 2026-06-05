import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from './prisma.service';
import { Roles } from './decorators';

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @Post('chat')
  async chat(@Request() req: any, @Body() body: any) {
    const { historial } = body;
    if (!historial || !Array.isArray(historial)) {
      throw new BadRequestException(
        'El historial de chat es obligatorio y debe ser una lista.',
      );
    }
    return {
      respuesta: await this.aiService.procesarConsulta(req.user, historial),
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Get('config')
  async getConfig() {
    const modelConfig = await this.prisma.configuracion.findUnique({
      where: { clave: 'ai_model' },
    });
    const keyConfig = await this.prisma.configuracion.findUnique({
      where: { clave: 'openai_api_key' },
    });
    const timezoneConfig = await this.prisma.configuracion.findUnique({
      where: { clave: 'system_timezone' },
    });

    const activeModel = modelConfig?.valor || 'gpt-4o-mini';
    const key = keyConfig?.valor || process.env.OPENAI_API_KEY || '';
    const timezone = timezoneConfig?.valor || 'America/El_Salvador';

    // Mask key sk-proj-...1234
    let maskedKey = '';
    if (key) {
      if (key.length > 8) {
        maskedKey = `${key.slice(0, 7)}...${key.slice(-4)}`;
      } else {
        maskedKey = '••••••••••••';
      }
    }

    return {
      activeModel,
      hasKey: !!key,
      maskedKey,
      timezone,
    };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('config')
  async saveConfig(@Body() body: any) {
    const { model, apiKey, timezone } = body;
    if (!model) {
      throw new BadRequestException('El modelo activo es requerido.');
    }

    await this.prisma.configuracion.upsert({
      where: { clave: 'ai_model' },
      update: { valor: model },
      create: { clave: 'ai_model', valor: model },
    });

    // If apiKey is provided and is not the masked one, save it
    if (apiKey && !apiKey.includes('...')) {
      await this.prisma.configuracion.upsert({
        where: { clave: 'openai_api_key' },
        update: { valor: apiKey },
        create: { clave: 'openai_api_key', valor: apiKey },
      });
    }

    if (timezone) {
      await this.prisma.configuracion.upsert({
        where: { clave: 'system_timezone' },
        update: { valor: timezone },
        create: { clave: 'system_timezone', valor: timezone },
      });
    }

    return { message: 'Configuración guardada con éxito.' };
  }

  @Roles('ADMINISTRADOR', 'SUPERVISOR')
  @Post('config/test')
  async testConfig(@Body() body: any) {
    const { apiKey } = body;
    if (!apiKey) {
      throw new BadRequestException(
        'API Key es requerida para probar la conexión.',
      );
    }

    let realKey = apiKey;
    if (apiKey.includes('...')) {
      // Use existing saved key
      const keyConfig = await this.prisma.configuracion.findUnique({
        where: { clave: 'openai_api_key' },
      });
      realKey = keyConfig?.valor || process.env.OPENAI_API_KEY || '';
    }

    if (!realKey) {
      throw new BadRequestException(
        'No hay una clave configurada para probar.',
      );
    }

    const success = await this.aiService.testConnection(realKey);
    return { success, message: 'Conexión con OpenAI establecida con éxito.' };
  }
}
