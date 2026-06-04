import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import OpenAI from 'openai';
import { getTimezoneOffsetMinutes } from './utils/timezone';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  private async getOpenAIClient() {
    const configKey = await this.prisma.configuracion.findUnique({
      where: { clave: 'openai_api_key' },
    });
    const key = configKey?.valor || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new BadRequestException(
        'La API Key de OpenAI no está configurada. Por favor, confígurela en Utilidades > Configuración de IA.',
      );
    }
    return new OpenAI({ apiKey: key });
  }

  private async getActiveModel() {
    const configModel = await this.prisma.configuracion.findUnique({
      where: { clave: 'ai_model' },
    });
    return configModel?.valor || 'gpt-4o-mini';
  }

  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const client = new OpenAI({ apiKey });
      await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });
      return true;
    } catch (e: any) {
      throw new BadRequestException(`Error al verificar API Key: ${e.message}`);
    }
  }

  async procesarConsulta(user: any, historial: any[]): Promise<string> {
    const openai = await this.getOpenAIClient();
    const model = await this.getActiveModel();

    const { offsetStr, timezone } = await getTimezoneOffsetMinutes(this.prisma);
    const now = new Date();
    const nowString = now.toLocaleDateString('en-CA', { timeZone: timezone });
    const nowTimeStr = now.toLocaleTimeString('es-CL', { timeZone: timezone });
    const dayOfWeek = now.toLocaleDateString('es-CL', { weekday: 'long', timeZone: timezone });

    // Enforce sucursal parameter if not admin or supervisor
    const isHQ = user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR';
    const sucursalFiltro = isHQ ? null : user.sucursalId;

    // Cargar manual del sistema dinámicamente si existe
    let manualContext = '';
    try {
      const fs = require('fs');
      const path = require('path');
      const manualPath = path.join(process.cwd(), 'manual_sistema.md');
      if (fs.existsSync(manualPath)) {
        manualContext = fs.readFileSync(manualPath, 'utf-8');
      }
    } catch (e) {
      console.warn('No se pudo cargar el manual del sistema:', e);
    }

    const systemPrompt = `Eres "Vaquita AI", el asistente inteligente de operaciones oficial de la cadena de lácteos "La Vaquita".
Tienes acceso a consultas en tiempo real sobre la base de datos del sistema para ayudar a responder las preguntas del usuario.
Usa las funciones de herramientas (tools) disponibles para obtener los datos necesarios.

Además de los datos dinámicos de la base de datos, cuentas con el MANUAL OPERATIVO DEL SISTEMA para responder cualquier pregunta del usuario sobre cómo funciona la aplicación, flujos operativos (como recibir lotes por OC, abrir caja, mermas, etc.), roles y permisos.

MANUAL OPERATIVO DEL SISTEMA:
${manualContext || 'No disponible por el momento.'}

CONTRATO DE RESPUESTA SOBRE EL MANUAL:
- Si el usuario pregunta cómo se realiza un proceso operativo, descríbelo paso a paso basándote estrictamente en el manual anterior.

CONTEXTO DEL SISTEMA:
- Fecha Actual (Hoy): ${nowString} (${dayOfWeek})
- Hora Actual: ${nowTimeStr}
- Zona Horaria: ${timezone} (Offset: ${offsetStr})

CONTEXTO DEL USUARIO:
- Nombre: ${user.nombre}
- Rol: ${user.rol}
- Sucursal asignada: ${user.sucursalNombre || 'HQ / Todas'}
- ID de Sucursal: ${user.sucursalId || 'Ninguno'}

REGLAS DE SEGURIDAD IMPORTANTES:
1. Si tu rol no es ADMINISTRADOR o SUPERVISOR, solo tienes permitido consultar información de tu propia sucursal (${user.sucursalNombre || 'N/A'}).
2. Aunque el usuario te pida ver datos globales o de otras sucursales, debes filtrar y pasar únicamente tu ID de sucursal (${user.sucursalId}) como parámetro. El backend forzará este filtro de todas formas por seguridad.

PAUTAS DE RESPUESTA:
- Responde siempre de forma profesional, clara y cordial.
- Presenta los datos numéricos y listas en formatos visuales excelentes usando Markdown (negritas, listas con viñetas y tablas legibles).
- Formatea los valores monetarios en dólares estadounidenses (USD) con dos decimales (ej. $46.20, $1,500.00). NUNCA multipliques ni dividas los valores recibidos, úsalos tal como vienen.
- Si la información requerida no se encuentra en las herramientas, dilo amablemente.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...historial.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
    ];

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'obtenerDetalleSucursales',
          description: 'Obtiene el listado completo de sucursales operativas en el sistema.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerResumenInventario',
          description: 'Obtiene un resumen y listado de existencias del inventario actual.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerProductosCriticos',
          description: 'Obtiene la lista de productos que están por debajo de su stock mínimo de seguridad.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerReporteVentas',
          description: 'Obtiene el resumen de ingresos y métodos de pago de ventas en un rango de fechas.',
          parameters: {
            type: 'object',
            properties: {
              fechaInicio: { type: 'string', description: 'Fecha de inicio en formato YYYY-MM-DD.' },
              fechaFin: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD.' },
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
            },
            required: ['fechaInicio', 'fechaFin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerMermasRecientes',
          description: 'Obtiene el registro de pérdidas, roturas y mermas de productos registradas en el sistema.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
              limit: { type: 'number', description: 'Límite de registros a retornar.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerAlertasFrioActivas',
          description: 'Obtiene el listado de alertas térmicas activas en las neveras o freezers.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerOrdenesCompra',
          description: 'Obtiene el listado de órdenes de compra del sistema y sus estados.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerLotesPorVencer',
          description: 'Obtiene la lista de lotes activos (con existencias en stock) que están próximos a vencer o ya vencidos.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: { type: 'string', description: 'ID opcional de la sucursal para filtrar.' },
              diasLimite: { type: 'number', description: 'Límite de días hacia el futuro para considerar próximo a vencer. Por defecto es 15.' },
            },
          },
        },
      },
    ];

    try {
      const response = await openai.chat.completions.create({
        model,
        messages,
        tools,
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage);

        for (const tc of responseMessage.tool_calls) {
          const toolCall = tc as any;
          const functionName = toolCall.function.name;
          const rawArgs = JSON.parse(toolCall.function.arguments);

          // Force sucursalId security check
          if (sucursalFiltro) {
            rawArgs.sucursalId = sucursalFiltro;
          }

          let functionResult: any;

          try {
            if (functionName === 'obtenerDetalleSucursales') {
              functionResult = await this.obtenerDetalleSucursales();
            } else if (functionName === 'obtenerResumenInventario') {
              functionResult = await this.obtenerResumenInventario(rawArgs.sucursalId);
            } else if (functionName === 'obtenerProductosCriticos') {
              functionResult = await this.obtenerProductosCriticos(rawArgs.sucursalId);
            } else if (functionName === 'obtenerReporteVentas') {
              functionResult = await this.obtenerReporteVentas(
                rawArgs.fechaInicio,
                rawArgs.fechaFin,
                rawArgs.sucursalId,
              );
            } else if (functionName === 'obtenerMermasRecientes') {
              functionResult = await this.obtenerMermasRecientes(
                rawArgs.sucursalId,
                rawArgs.limit,
              );
            } else if (functionName === 'obtenerAlertasFrioActivas') {
              functionResult = await this.obtenerAlertasFrioActivas(rawArgs.sucursalId);
            } else if (functionName === 'obtenerOrdenesCompra') {
              functionResult = await this.obtenerOrdenesCompra(rawArgs.sucursalId);
            } else if (functionName === 'obtenerLotesPorVencer') {
              functionResult = await this.obtenerLotesPorVencer(
                rawArgs.sucursalId,
                rawArgs.diasLimite,
              );
            } else {
              functionResult = { error: `Función ${functionName} no implementada.` };
            }
          } catch (err: any) {
            functionResult = { error: `Error ejecutando consulta: ${err.message}` };
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(functionResult),
          });
        }

        // Send back to OpenAI to compile the final answer
        const secondResponse = await openai.chat.completions.create({
          model,
          messages,
        });

        return secondResponse.choices[0].message.content || 'Sin respuesta.';
      }

      return responseMessage.content || 'Sin respuesta.';
    } catch (e: any) {
      throw new BadRequestException(`Error en la consulta del chatbot: ${e.message}`);
    }
  }

  // --- TOOL METHODS ---

  private async obtenerDetalleSucursales() {
    return this.prisma.sucursal.findMany({
      where: { estado: 'ACTIVO' },
      select: { id: true, codigo: true, nombre: true, direccion: true },
    });
  }

  private async obtenerResumenInventario(sucursalId?: string) {
    const filter: any = {};
    if (sucursalId) filter.sucursalId = sucursalId;

    const inventarios = await this.prisma.inventario.findMany({
      where: filter,
      include: {
        producto: {
          select: { sku: true, descripcion: true, categoria: true, precioVenta: true },
        },
        sucursal: {
          select: { nombre: true },
        },
      },
    });

    const totalProductos = new Set(inventarios.map((i) => i.productoId)).size;
    const stockTotal = inventarios.reduce((sum, i) => sum + i.existencia, 0);
    const valorEstimado = inventarios.reduce(
      (sum, i) => sum + i.existencia * Number(i.producto.precioVenta),
      0,
    );

    const items = inventarios.map((i) => ({
      producto: i.producto.descripcion,
      sku: i.producto.sku,
      categoria: i.producto.categoria,
      sucursal: i.sucursal.nombre,
      existencia: i.existencia,
    })).slice(0, 50); // Limit to top 50 to avoid token overload

    return { totalProductos, stockTotal, valorEstimado, items };
  }

  private async obtenerProductosCriticos(sucursalId?: string) {
    const filter: any = {};
    if (sucursalId) filter.sucursalId = sucursalId;

    const inventarios = await this.prisma.inventario.findMany({
      where: filter,
      include: {
        producto: { select: { sku: true, descripcion: true } },
        sucursal: { select: { nombre: true } },
      },
    });

    // In-memory filter to support both SQLite and Postgres safely
    return inventarios
      .filter((i) => i.existencia < i.existMin)
      .map((i) => ({
        producto: i.producto.descripcion,
        sku: i.producto.sku,
        sucursal: i.sucursal.nombre,
        existencia: i.existencia,
        stockMinimo: i.existMin,
      }));
  }

  private async obtenerReporteVentas(fechaInicio: string, fechaFin: string, sucursalId?: string) {
    const { offsetStr } = await getTimezoneOffsetMinutes(this.prisma);
    const filter: any = {
      fecha: {
        gte: new Date(`${fechaInicio}T00:00:00${offsetStr}`),
        lte: new Date(`${fechaFin}T23:59:59${offsetStr}`),
      },
    };
    if (sucursalId) filter.sucursalId = sucursalId;

    const ventas = await this.prisma.venta.findMany({
      where: filter,
    });

    const totalIngresos = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalTickets = ventas.length;
    const promedioTicket = totalTickets > 0 ? totalIngresos / totalTickets : 0;

    const metodosPago: Record<string, number> = {};
    ventas.forEach((v) => {
      metodosPago[v.metodoPago] = (metodosPago[v.metodoPago] || 0) + Number(v.total);
    });

    return { totalIngresos, totalTickets, promedioTicket, metodosPago };
  }

  private async obtenerMermasRecientes(sucursalId?: string, limit = 30) {
    const filter: any = { tipo: 'MERMA' };
    if (sucursalId) filter.sucursalOrigenId = sucursalId;

    const mermas = await this.prisma.movimientoInventario.findMany({
      where: filter,
      include: {
        producto: { select: { sku: true, descripcion: true } },
        lote: { select: { numeroLote: true } },
        sucursalOrigen: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
      take: limit,
    });

    return mermas.map((m) => ({
      fecha: m.fecha,
      producto: m.producto.descripcion,
      sku: m.producto.sku,
      lote: m.lote?.numeroLote || 'N/A',
      cantidad: m.cantidad,
      motivo: m.motivo,
      sucursal: m.sucursalOrigen?.nombre || 'N/A',
    }));
  }

  private async obtenerAlertasFrioActivas(sucursalId?: string) {
    const filter: any = { tipo: 'TEMPERATURA', estado: 'ACTIVA' };
    if (sucursalId) filter.sucursalId = sucursalId;

    const alertas = await this.prisma.alerta.findMany({
      where: filter,
      include: {
        sucursal: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    return alertas.map((a) => ({
      fecha: a.fecha,
      sucursal: a.sucursal.nombre,
      tipo: a.tipo,
      mensaje: a.mensaje,
      estado: a.estado,
    }));
  }

  private async obtenerOrdenesCompra(sucursalId?: string) {
    const filter: any = {};
    if (sucursalId) filter.sucursalId = sucursalId;

    const ocs = await this.prisma.ordenCompra.findMany({
      where: filter,
      include: {
        proveedor: { select: { nombre: true } },
        sucursal: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    return ocs.map((o) => ({
      numeroOrden: o.numeroOrden,
      proveedor: o.proveedor.nombre,
      sucursal: o.sucursal.nombre,
      estado: o.estado,
      fecha: o.fecha,
      total: o.total,
    }));
  }

  private async obtenerLotesPorVencer(sucursalId?: string, diasLimite = 15) {
    const hoy = new Date();
    const lotes = await this.prisma.lote.findMany({
      where: {
        cantidadActual: { gt: 0 },
      },
      include: {
        producto: {
          select: { sku: true, descripcion: true, costo: true, precioVenta: true },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    let lotesFiltrados = lotes;
    if (sucursalId) {
      const inventarios = await this.prisma.inventario.findMany({
        where: { sucursalId, existencia: { gt: 0 } },
        select: { productoId: true },
      });
      const productoIdsEnSucursal = new Set(inventarios.map((i) => i.productoId));
      lotesFiltrados = lotes.filter((l) => productoIdsEnSucursal.has(l.productoId));
    }

    const resultado = lotesFiltrados
      .map((l) => {
        const diasRestantes = Math.ceil(
          (l.fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          lote: l.numeroLote,
          producto: l.producto.descripcion,
          sku: l.producto.sku,
          cantidadActual: l.cantidadActual,
          fechaVencimiento: l.fechaVencimiento.toISOString().split('T')[0],
          diasRestantes,
          costoUnitario: l.producto.costo,
          precioVenta: l.producto.precioVenta,
          estado: l.estado,
        };
      })
      .filter((l) => l.diasRestantes <= diasLimite);

    return resultado;
  }
}
