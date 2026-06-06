import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import OpenAI, { toFile } from 'openai';
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

  async procesarConsulta(user: any, historial: any[]): Promise<any> {
    const openai = await this.getOpenAIClient();
    const model = await this.getActiveModel();

    const { offsetStr, timezone } = await getTimezoneOffsetMinutes(this.prisma);
    const now = new Date();
    const nowString = now.toLocaleDateString('en-CA', { timeZone: timezone });
    const nowTimeStr = now.toLocaleTimeString('es-CL', { timeZone: timezone });
    const dayOfWeek = now.toLocaleDateString('es-CL', {
      weekday: 'long',
      timeZone: timezone,
    });
    // Enforce sucursal parameter if not admin or supervisor
    const isHQ = user.rol === 'ADMINISTRADOR' || user.rol === 'SUPERVISOR';
    const sucursalFiltro = isHQ ? null : user.sucursalId;

    let sucursalNombre = 'Todas / HQ';
    if (user.sucursalId) {
      const dbSuc = await this.prisma.sucursal.findUnique({
        where: { id: user.sucursalId },
      });
      if (dbSuc) {
        sucursalNombre = dbSuc.nombre;
      }
    }

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
Tienes acceso a consultas en tiempo real sobre la base de datos del sistema (incluyendo inventario, ventas, compras, mermas, cadena de frío y ahora el nuevo módulo de LOGÍSTICA, RUTAS e inventario de REABASTECIMIENTO) para ayudar a responder las preguntas del usuario.
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
- Sucursal asignada: ${sucursalNombre}
- ID de Sucursal: ${user.sucursalId || 'Ninguno'}

REGLAS DE SEGURIDAD Y ACCESO DE SUCURSAL:
${
  isHQ
    ? `- Como tu rol es ${user.rol}, tienes acceso global y completo (HQ). Tienes permitido consultar la información de todas las sucursales, comparar ventas/inventarios entre sucursales, y consolidar datos globales. Puedes invocar las herramientas sin el parámetro sucursalId o con el sucursalId de cualquier sucursal si el usuario lo solicita. IMPORTANTE: Si el usuario te pide un reporte consolidado global, ventas de todas las sucursales, inventario global o comparación general, NO debes pasar el parámetro sucursalId en absoluto a las herramientas. Solo pasalo si la pregunta es sobre una sucursal específica.`
    : `- Como tu rol es ${user.rol}, estás estrictamente limitado a tu propia sucursal (${sucursalNombre}). No tienes permitido consultar información global o de otras sucursales. Aunque el usuario te pida ver datos de otras sucursales, debes pasar obligatoriamente tu ID de sucursal (${user.sucursalId}) como parámetro a todas las herramientas. El backend forzará este filtro por seguridad.`
}

PAUTAS DE RESPUESTA:
- Responde siempre de forma profesional, clara y cordial.
- Presenta los datos numéricos y listas en formatos visuales excelentes usando Markdown (negritas, listas con viñetas y tablas legibles).
- Utiliza siempre los valores monetarios ya formateados como cadenas de texto (ej. totalIngresosFormateado, totalFormateado, etc.) que devuelven las herramientas directamente. NUNCA intentes reformatear, recalcular, multiplicar o dividir estos valores numéricos.
- Al presentar reportes o resúmenes de cualquier módulo (ventas, compras, inventario, mermas, logística, etc.), limítate a mostrar únicamente los datos principales y métricas solicitadas (ej. montos facturados, stock disponible, cantidades de pérdidas). NO incluyes cantidad de tickets, promedios por ticket, métodos de pago, IDs internos, fechas de creación ni ningún otro metadato o dato secundario, a menos que el usuario lo solicite explícitamente en su pregunta.
- Si la información requerida no se encuentra en las herramientas, dilo amablemente.

REGLAS DE NAVEGACIÓN Y PERMISOS:
- Tienes la herramienta "navegarAPagina" para redirigir al usuario a diferentes secciones del sistema.
- Debes invocar siempre la herramienta "navegarAPagina" cada vez que el usuario te pida explícitamente navegar, ir, abrir, ver o dirigirse a una sección del sistema, ignorando cualquier resultado previo en el historial de chat (debes llamarla siempre para validar los permisos actuales en tiempo real).
- Si la herramienta responde que la navegación fue exitosa (success: true), confirma al usuario de manera cordial que lo estás redirigiendo a esa pantalla.
- Si la herramienta responde indicando un error (success: false), explícale amablemente al usuario el motivo del error devuelto por la herramienta (ej. falta de permisos o sección no válida) y detén el flujo de llamadas de herramientas para esta consulta (no vuelvas a llamarla en bucle para el mismo mensaje).`;

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
          description:
            'Obtiene el listado completo de sucursales operativas en el sistema.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerResumenInventario',
          description:
            'Obtiene un resumen y listado de existencias del inventario actual.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerProductosCriticos',
          description:
            'Obtiene la lista de productos que están por debajo de su stock mínimo de seguridad.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar. IMPORTANTE: Si el usuario solicita un reporte global, NO pases este parámetro.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerReporteVentas',
          description:
            'Obtiene el resumen de ingresos y métodos de pago de ventas en un rango de fechas.',
          parameters: {
            type: 'object',
            properties: {
              fechaInicio: {
                type: 'string',
                description: 'Fecha de inicio en formato YYYY-MM-DD.',
              },
              fechaFin: {
                type: 'string',
                description: 'Fecha de fin en formato YYYY-MM-DD.',
              },
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar. IMPORTANTE: Si el usuario solicita un consolidado global o ventas de todas las sucursales, NO pases este parámetro.',
              },
            },
            required: ['fechaInicio', 'fechaFin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerMermasRecientes',
          description:
            'Obtiene el registro de pérdidas, roturas y mermas de productos registradas en el sistema.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
              limit: {
                type: 'number',
                description: 'Límite de registros a retornar.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerAlertasFrioActivas',
          description:
            'Obtiene el listado de alertas térmicas activas en las neveras o freezers.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerOrdenesCompra',
          description:
            'Obtiene el listado de órdenes de compra del sistema y sus estados.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerLotesPorVencer',
          description:
            'Obtiene la lista de lotes activos (con existencias en stock) que están próximos a vencer o ya vencidos.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
              diasLimite: {
                type: 'number',
                description:
                  'Límite de días hacia el futuro para considerar próximo a vencer. Por defecto es 15.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerFlotaLogistica',
          description:
            'Obtiene el listado de camiones (placa, estado, coordenadas GPS, capacidades) y conductores registrados en el sistema de logística.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerRutasLogistica',
          description:
            'Obtiene el listado de rutas de distribución planificadas o en transito, incluyendo métricas y lecturas de telemetría de frío.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerTransferenciasReabastecimiento',
          description:
            'Obtiene el listado de transferencias preventivas de stock del CD a sucursales.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description:
                  'ID opcional de la sucursal (para filtrar origen o destino).',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'obtenerPropuestasReabastecimiento',
          description:
            'Calcula y obtiene las propuestas sugeridas de reabastecimiento de productos para las sucursales, indicando el stock actual y la cantidad sugerida.',
          parameters: {
            type: 'object',
            properties: {
              sucursalId: {
                type: 'string',
                description: 'ID opcional de la sucursal para filtrar.',
              },
              useSafetyStockMin: {
                type: 'boolean',
                description:
                  'Si es true, utiliza el stock mínimo de seguridad como base mínima si supera la estimación de ventas.',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'navegarAPagina',
          description:
            'Navega o redirige al usuario a una sección o pantalla específica del sistema ERP de acuerdo a sus permisos.',
          parameters: {
            type: 'object',
            properties: {
              seccion: {
                type: 'string',
                enum: [
                  'dashboard',
                  'pos',
                  'ventas',
                  'frio',
                  'trazabilidad',
                  'inventario',
                  'traslados',
                  'mermas',
                  'lotes',
                  'productos',
                  'kardex',
                  'movimientos',
                  'produccion',
                  'calidad',
                  'compras',
                  'finanzas',
                  'auditoria',
                  'chat',
                  'logistica',
                  'asistente',
                  'utilidades',
                  'recepcion_leche',
                  'auditorias_calidad',
                  'incidencias',
                  'bitacora',
                  'personal',
                  'facturas',
                  'pagos',
                  'reabastecimiento',
                  'pronostico',
                  'rutas',
                  'monitoreo',
                  'conductores',
                  'recetas',
                  'ordenes',
                  'mermas_produccion',
                  'categorias',
                  'unidades',
                  'tipos',
                  'proveedores',
                  'condiciones',
                  'sucursales',
                  'roles',
                  'manual',
                  'configuracion'
                ],
                description: 'La sección o pantalla de la aplicación a la que se desea navegar, incluyendo cualquier sub-pestaña específica.',
              },
            },
            required: ['seccion'],
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
      let redirectPath: string | null = null;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        messages.push(responseMessage);

        for (const tc of responseMessage.tool_calls) {
          const toolCall = tc as any;
          const functionName = toolCall.function.name;
          const rawArgs = JSON.parse(toolCall.function.arguments);

          // Force sucursalId security check
          if (sucursalFiltro && functionName !== 'navegarAPagina') {
            rawArgs.sucursalId = sucursalFiltro;
          }

          let functionResult: any;

          try {
            if (functionName === 'obtenerDetalleSucursales') {
              functionResult = await this.obtenerDetalleSucursales();
            } else if (functionName === 'obtenerResumenInventario') {
              functionResult = await this.obtenerResumenInventario(
                rawArgs.sucursalId,
              );
            } else if (functionName === 'obtenerProductosCriticos') {
              functionResult = await this.obtenerProductosCriticos(
                rawArgs.sucursalId,
              );
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
              functionResult = await this.obtenerAlertasFrioActivas(
                rawArgs.sucursalId,
              );
            } else if (functionName === 'obtenerOrdenesCompra') {
              functionResult = await this.obtenerOrdenesCompra(
                rawArgs.sucursalId,
              );
            } else if (functionName === 'obtenerLotesPorVencer') {
              functionResult = await this.obtenerLotesPorVencer(
                rawArgs.sucursalId,
                rawArgs.diasLimite,
              );
            } else if (functionName === 'obtenerFlotaLogistica') {
              functionResult = await this.obtenerFlotaLogistica();
            } else if (functionName === 'obtenerRutasLogistica') {
              functionResult = await this.obtenerRutasLogistica();
            } else if (
              functionName === 'obtenerTransferenciasReabastecimiento'
            ) {
              functionResult = await this.obtenerTransferenciasReabastecimiento(
                rawArgs.sucursalId,
              );
            } else if (functionName === 'obtenerPropuestasReabastecimiento') {
              functionResult = await this.obtenerPropuestasReabastecimiento(
                rawArgs.sucursalId,
                rawArgs.useSafetyStockMin,
              );
            } else if (functionName === 'navegarAPagina') {
              functionResult = await this.ejecutarNavegacion(user, rawArgs.seccion);
              if (functionResult.success) {
                redirectPath = functionResult.path;
              }
            } else {
              functionResult = {
                error: `Función ${functionName} no implementada.`,
              };
            }
          } catch (err: any) {
            functionResult = {
              error: `Error ejecutando consulta: ${err.message}`,
            };
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

        return {
          respuesta: secondResponse.choices[0].message.content || 'Sin respuesta.',
          navegacion: redirectPath,
        };
      }

      return {
        respuesta: responseMessage.content || 'Sin respuesta.',
        navegacion: null,
      };
    } catch (e: any) {
      throw new BadRequestException(
        `Error en la consulta del chatbot: ${e.message}`,
      );
    }
  }

  private async ejecutarNavegacion(user: any, seccion: string) {
    const PAGE_PERMISSIONS: Record<string, { permission: string; path: string }> = {
      dashboard: { permission: 'VER_DASHBOARD', path: '/' },
      pos: { permission: 'VER_POS', path: '/pos' },
      ventas: { permission: 'VER_VENTAS', path: '/ventas' },
      frio: { permission: 'VER_FRIO', path: '/frio' },
      trazabilidad: { permission: 'VER_TRAZABILIDAD', path: '/trazabilidad' },
      inventario: { permission: 'VER_INVENTARIO', path: '/inventario' },
      traslados: { permission: 'VER_TRASLADO_INTERSUCURSALES', path: '/inventario?tab=traslados' },
      mermas: { permission: 'VER_INVENTARIO', path: '/inventario?tab=mermas' },
      lotes: { permission: 'VER_INVENTARIO', path: '/inventario?tab=lotes' },
      productos: { permission: 'VER_INVENTARIO', path: '/inventario?tab=productos' },
      kardex: { permission: 'VER_INVENTARIO', path: '/inventario?tab=movimientos' },
      movimientos: { permission: 'VER_INVENTARIO', path: '/inventario?tab=movimientos' },
      produccion: { permission: 'VER_PRODUCCION', path: '/produccion' },
      calidad: { permission: 'VER_CALIDAD', path: '/calidad' },
      compras: { permission: 'VER_COMPRAS', path: '/compras' },
      finanzas: { permission: 'VER_FINANZAS', path: '/finanzas' },
      auditoria: { permission: 'VER_AUDITORIA', path: '/auditoria' },
      chat: { permission: 'VER_CHAT', path: '/chat' },
      logistica: { permission: 'VER_LOGISTICA', path: '/logistica' },
      asistente: { permission: 'USAR_ASISTENTE', path: '/asistente' },
      utilidades: { permission: 'VER_UTILIDADES', path: '/utilidades' },

      // Calidad sub-tabs
      recepcion_leche: { permission: 'VER_CALIDAD', path: '/calidad?tab=recepcion' },
      auditorias_calidad: { permission: 'VER_CALIDAD', path: '/calidad?tab=auditorias' },
      incidencias: { permission: 'VER_CALIDAD', path: '/calidad?tab=incidencias' },

      // Auditoria sub-tabs
      bitacora: { permission: 'VER_AUDITORIA', path: '/auditoria?tab=bitacora' },
      personal: { permission: 'VER_AUDITORIA', path: '/auditoria?tab=personal' },

      // Finanzas sub-tabs
      facturas: { permission: 'VER_FINANZAS', path: '/finanzas?tab=facturas' },
      pagos: { permission: 'VER_FINANZAS', path: '/finanzas?tab=pagos' },

      // Logistica sub-tabs
      reabastecimiento: { permission: 'VER_LOGISTICA', path: '/logistica?tab=reabastecimiento' },
      pronostico: { permission: 'VER_LOGISTICA', path: '/logistica?tab=pronostico' },
      rutas: { permission: 'VER_LOGISTICA', path: '/logistica?tab=rutas' },
      monitoreo: { permission: 'VER_LOGISTICA', path: '/logistica?tab=monitoreo' },
      conductores: { permission: 'VER_LOGISTICA', path: '/logistica?tab=conductores' },

      // Produccion sub-tabs
      recetas: { permission: 'VER_PRODUCCION', path: '/produccion?tab=recetas' },
      ordenes: { permission: 'VER_PRODUCCION', path: '/produccion?tab=ordenes' },
      mermas_produccion: { permission: 'VER_PRODUCCION', path: '/produccion?tab=mermas' },

      // Utilidades sub-tabs
      categorias: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=categorias' },
      unidades: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=unidades' },
      tipos: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=tipos' },
      proveedores: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=proveedores' },
      condiciones: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=condiciones' },
      sucursales: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=sucursales' },
      roles: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=roles' },
      manual: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=manual' },
      manual_del_sistema: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=manual' },
      configuracion: { permission: 'VER_UTILIDADES', path: '/utilidades?tab=configuracion' },
    };

    // Normalize input to remove accents/diacritics and make lowercase
    let normalized = (seccion || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Map common aliases/synonyms
    const ALIASES: Record<string, string> = {
      'punto de venta': 'pos',
      'caja': 'pos',
      'cadena de frio': 'frio',
      'inventarios': 'inventario',
      'control de calidad': 'calidad',
      'cuentas por pagar': 'facturas',
      'personal': 'personal',
      'rutas': 'rutas',
      'asistente ai': 'asistente',

      // Calidad
      'recepcion leche': 'recepcion_leche',
      'recepcion de leche': 'recepcion_leche',
      'insumos lacteos': 'recepcion_leche',
      'auditorias calidad': 'auditorias_calidad',
      'auditorias en proceso': 'auditorias_calidad',
      'no conformidades': 'incidencias',
      'incidencias calidad': 'incidencias',
      'recepcion_de_leche': 'recepcion_leche',
      'insumos_lacteos': 'recepcion_leche',
      'auditorias_calidad': 'auditorias_calidad',
      'auditorias_en_proceso': 'auditorias_calidad',
      'no_conformidades': 'incidencias',
      'incidencias_calidad': 'incidencias',

      // Auditoria
      'bitacora de auditoria': 'bitacora',
      'bitacora': 'bitacora',
      'logs': 'bitacora',
      'gestion de personal': 'personal',
      'usuarios': 'personal',
      'bitacora_de_auditoria': 'bitacora',
      'gestion_de_personal': 'personal',

      // Finanzas
      'facturas por pagar': 'facturas',
      'historial de pagos': 'pagos',
      'pagos finanzas': 'pagos',
      'facturas_por_pagar': 'facturas',
      'historial_de_pagos': 'pagos',
      'pagos_finanzas': 'pagos',

      // Logistica
      'reabastecimiento automatico': 'reabastecimiento',
      'pronostico de demanda': 'pronostico',
      'simulacion de demanda': 'pronostico',
      'planificacion de rutas': 'rutas',
      'rutas logistica': 'rutas',
      'monitoreo en vivo': 'monitoreo',
      'mapa logistica': 'monitoreo',
      'flota y conductores': 'conductores',
      'conductores': 'conductores',
      'camiones': 'conductores',
      'reabastecimiento_automatico': 'reabastecimiento',
      'pronostico_de_demanda': 'pronostico',
      'simulacion_de_demanda': 'pronostico',
      'planificacion_de_rutas': 'rutas',
      'rutas_logistica': 'rutas',
      'monitoreo_en_vivo': 'monitoreo',
      'mapa_logistica': 'monitoreo',
      'flota_y_conductores': 'conductores',

      // Produccion
      'recetario maestro': 'recetas',
      'recetas': 'recetas',
      'ordenes de produccion': 'ordenes',
      'op': 'ordenes',
      'mermas produccion': 'mermas_produccion',
      'desechos': 'mermas_produccion',
      'recetario_maestro': 'recetas',
      'ordenes_de_produccion': 'ordenes',
      'mermas_produccion': 'mermas_produccion',

      // Utilidades
      'categorias de productos': 'categorias',
      'unidades de medida': 'unidades',
      'tipos de producto': 'tipos',
      'proveedores': 'proveedores',
      'condiciones de pago': 'condiciones',
      'terminos de pago': 'condiciones',
      'gestion de sucursales': 'sucursales',
      'roles y permisos': 'roles',
      'manual del sistema': 'manual',
      'manual_del_sistema': 'manual',
      'guia del sistema': 'manual',
      'guia_del_sistema': 'manual',
      'guia': 'manual',
      'configuracion del sistema': 'configuracion',
      'categorias_de_productos': 'categorias',
      'unidades_de_medida': 'unidades',
      'tipos_de_producto': 'tipos',
      'condiciones_de_pago': 'condiciones',
      'terminos_de_pago': 'condiciones',
      'gestion_de_sucursales': 'sucursales',
      'roles_y_permisos': 'roles',
      'configuracion_del_sistema': 'configuracion',
    };

    if (ALIASES[normalized]) {
      normalized = ALIASES[normalized];
    }

    const target = PAGE_PERMISSIONS[normalized];
    console.log('[ejecutarNavegacion] User:', user?.nombre, 'Rol:', user?.rol, 'Original:', seccion, 'Normalized:', normalized, 'Found:', !!target);

    if (!target) {
      return { success: false, error: `Sección no reconocida: ${seccion}` };
    }

    // Admin and Supervisor bypass all permission checks
    if (user?.rol === 'ADMINISTRADOR' || user?.rol === 'SUPERVISOR') {
      return { success: true, path: target.path };
    }

    // Fetch user permissions from DB via role
    const dbRole = await this.prisma.rol.findUnique({
      where: { nombre: user?.rol },
    });

    let permisos: string[] = [];
    if (dbRole) {
      try {
        permisos = JSON.parse(dbRole.permisos);
      } catch (e) {
        permisos = [];
      }
    } else {
      // Fallbacks matching App.tsx / auth.controller.ts
      if (user?.rol === 'ALMACEN') {
        permisos = ['VER_DASHBOARD', 'VER_INVENTARIO', 'VER_PRODUCCION', 'VER_COMPRAS', 'VER_CHAT', 'VER_UTILIDADES', 'VER_TRASLADO_INTERSUCURSALES', 'VER_PRODUCTOS', 'VER_LOTES'];
      } else if (user?.rol === 'CAJERO') {
        permisos = ['VER_DASHBOARD', 'VER_POS', 'VER_CHAT'];
      } else if (user?.rol === 'CONTROL_CALIDAD' || user?.rol === 'CALIDAD') {
        permisos = ['VER_DASHBOARD', 'VER_CALIDAD', 'VER_CHAT', 'VER_LOTES'];
      }
    }

    // Special check for inventario and its tabs
    if (normalized === 'inventario') {
      const hasAccess = permisos.includes('VER_INVENTARIO') || permisos.includes('VER_TRASLADO_INTERSUCURSALES');
      if (hasAccess) {
        return { success: true, path: target.path };
      }
    } else if (normalized === 'lotes') {
      const hasAccess = permisos.includes('VER_INVENTARIO') || permisos.includes('VER_LOTES');
      if (hasAccess) {
        return { success: true, path: target.path };
      }
    } else if (normalized === 'productos') {
      const hasAccess = permisos.includes('VER_INVENTARIO') || permisos.includes('VER_PRODUCTOS');
      if (hasAccess) {
        return { success: true, path: target.path };
      }
    } else if (normalized === 'traslados') {
      const hasAccess = permisos.includes('VER_TRASLADO_INTERSUCURSALES') || permisos.includes('VER_INVENTARIO');
      if (hasAccess) {
        return { success: true, path: target.path };
      }
    } else {
      if (permisos.includes(target.permission)) {
        return { success: true, path: target.path };
      }
    }

    return {
      success: false,
      error: `El usuario con rol ${user?.rol} no tiene el permiso requerido (${target.permission}) para acceder a la sección ${seccion}.`,
    };
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
          select: {
            sku: true,
            descripcion: true,
            categoria: true,
            precioVenta: true,
          },
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

    const items = inventarios
      .map((i) => ({
        producto: i.producto.descripcion,
        sku: i.producto.sku,
        categoria: i.producto.categoria,
        sucursal: i.sucursal.nombre,
        existencia: i.existencia,
      }))
      .slice(0, 50); // Limit to top 50 to avoid token overload

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

  private async obtenerReporteVentas(
    fechaInicio: string,
    fechaFin: string,
    sucursalId?: string,
  ) {
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
      include: {
        sucursal: {
          select: { nombre: true },
        },
      },
    });

    const totalIngresos = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    // Breakdown per sucursal, including those with 0 sales
    const desgloseSucursales: Record<string, { nombre: string; total: number }> = {};
    const sucursalesDb = await this.prisma.sucursal.findMany({
      where: {
        estado: 'ACTIVO',
        ...(sucursalId ? { id: sucursalId } : {}),
      },
      select: { id: true, nombre: true },
    });

    sucursalesDb.forEach((s) => {
      desgloseSucursales[s.id] = {
        nombre: s.nombre,
        total: 0,
      };
    });

    ventas.forEach((v) => {
      const sId = v.sucursalId;
      const sNombre = v.sucursal?.nombre || 'Desconocida';
      if (!desgloseSucursales[sId]) {
        desgloseSucursales[sId] = {
          nombre: sNombre,
          total: 0,
        };
      }
      desgloseSucursales[sId].total += Number(v.total);
    });

    const totalIngresosFormateado = `$${totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return {
      totalIngresos: Number(totalIngresos.toFixed(2)),
      totalIngresosFormateado,
      desgloseSucursales: Object.values(desgloseSucursales).map((s) => ({
        nombre: s.nombre,
        total: Number(s.total.toFixed(2)),
        totalFormateado: `$${s.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      })),
    };
  }

  async transcribirAudio(buffer: Buffer, filename: string): Promise<string> {
    const openai = await this.getOpenAIClient();
    try {
      const file = await toFile(buffer, filename);
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
      });
      return transcription.text;
    } catch (e: any) {
      throw new BadRequestException(`Error al transcribir audio con Whisper: ${e.message}`);
    }
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
          select: {
            sku: true,
            descripcion: true,
            costo: true,
            precioVenta: true,
          },
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
      const productoIdsEnSucursal = new Set(
        inventarios.map((i) => i.productoId),
      );
      lotesFiltrados = lotes.filter((l) =>
        productoIdsEnSucursal.has(l.productoId),
      );
    }

    const resultado = lotesFiltrados
      .map((l) => {
        const diasRestantes = Math.ceil(
          (l.fechaVencimiento.getTime() - hoy.getTime()) /
            (1000 * 60 * 60 * 24),
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

  private async obtenerFlotaLogistica() {
    const camiones = await this.prisma.camion.findMany({
      select: {
        placa: true,
        capacidadPeso: true,
        capacidadVolumen: true,
        temperaturaMin: true,
        temperaturaMax: true,
        estado: true,
        gpsLat: true,
        gpsLng: true,
      },
    });
    const conductores = await this.prisma.conductor.findMany({
      select: {
        nombre: true,
        licencia: true,
        telefono: true,
        estado: true,
      },
    });
    return { camiones, conductores };
  }

  private async obtenerRutasLogistica() {
    return this.prisma.ruta.findMany({
      include: {
        camion: { select: { placa: true } },
        conductor: { select: { nombre: true } },
        puntos: {
          include: { sucursal: { select: { nombre: true } } },
          orderBy: { ordenVisita: 'asc' },
        },
        temperaturas: {
          orderBy: { fecha: 'desc' },
          take: 5,
        },
      },
      orderBy: { fecha: 'desc' },
      take: 20,
    });
  }

  private async obtenerTransferenciasReabastecimiento(sucursalId?: string) {
    const filter: any = {};
    if (sucursalId) {
      filter.OR = [{ origenId: sucursalId }, { destinoId: sucursalId }];
    }
    return this.prisma.transferencia.findMany({
      where: filter,
      include: {
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        detalles: {
          include: {
            producto: { select: { sku: true, descripcion: true } },
          },
        },
      },
      orderBy: { fechaEnvio: 'desc' },
      take: 20,
    });
  }

  private async obtenerPropuestasReabastecimiento(
    sucursalId?: string,
    useSafetyStockMin?: boolean,
  ) {
    const sucursales = await this.prisma.sucursal.findMany({
      where: { estado: 'ACTIVO' },
    });

    const plantaPrincipal = sucursales.find((s) => s.codigo === 'SUC-001');

    const productos = await this.prisma.producto.findMany({
      where: {
        estado: 'ACTIVO',
        tipoProducto: { in: ['PRODUCTO_TERMINADO', 'PT'] },
      },
    });

    const propuestas: any[] = [];
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const suc of sucursales) {
      if (suc.codigo === 'SUC-001') continue;
      if (sucursalId && suc.id !== sucursalId) continue;

      for (const prod of productos) {
        const inv = await this.prisma.inventario.findUnique({
          where: {
            productoId_sucursalId: { productoId: prod.id, sucursalId: suc.id },
          },
        });
        const stockActual = inv ? inv.existencia : 0;

        const transferenciasPendientes =
          await this.prisma.transferenciaDetalle.findMany({
            where: {
              productoId: prod.id,
              transferencia: {
                destinoId: suc.id,
                estado: { in: ['PENDIENTE', 'EN_TRANSITO'] },
              },
            },
            select: { cantidad: true },
          });
        const stockEnTransito = transferenciasPendientes.reduce(
          (sum, item) => sum + item.cantidad,
          0,
        );
        const stockDisponible = stockActual + stockEnTransito;

        const ventasDetalle = await this.prisma.ventaDetalle.findMany({
          where: {
            productoId: prod.id,
            venta: {
              sucursalId: suc.id,
              fecha: { gte: hace30Dias },
              estado: 'COMPLETADA',
            },
          },
          select: { cantidad: true },
        });

        const totalVendido = ventasDetalle.reduce(
          (sum, item) => sum + item.cantidad,
          0,
        );
        const promedioVentasDiarias =
          totalVendido > 0 ? totalVendido / 30 : 2.0;

        const diasInventario =
          promedioVentasDiarias > 0
            ? stockDisponible / promedioVentasDiarias
            : 0;

        let diasObjetivo = 5;
        if (prod.categoria === 'YOGURT') diasObjetivo = 7;
        else if (prod.categoria === 'QUESOS') diasObjetivo = 10;
        else if (prod.categoria === 'MANTEQUILLA') diasObjetivo = 15;

        let stockObjetivo = promedioVentasDiarias * diasObjetivo;

        if (useSafetyStockMin) {
          const stockMinimoSeguridad = inv ? inv.existMin : 5;
          stockObjetivo = Math.max(stockObjetivo, stockMinimoSeguridad);
        }

        if (stockDisponible < stockObjetivo) {
          const cantidadSugerida = Math.ceil(stockObjetivo - stockDisponible);

          // Buscar origen sugerido
          let tipoOrigen = 'CD';
          let origenSugeridoId = plantaPrincipal ? plantaPrincipal.id : null;
          let origenSugeridoNombre = plantaPrincipal
            ? plantaPrincipal.nombre
            : 'Centro de Distribución';
          let detalleRazon = 'Suministrado desde el Centro de Distribución';

          const otrosInventarios = await this.prisma.inventario.findMany({
            where: {
              productoId: prod.id,
              sucursalId: {
                notIn: [suc.id, plantaPrincipal?.id].filter(
                  Boolean,
                ) as string[],
              },
              existencia: { gt: 0 },
            },
            include: { sucursal: true },
          });

          for (const otroInv of otrosInventarios) {
            const otroVentasDetalle = await this.prisma.ventaDetalle.findMany({
              where: {
                productoId: prod.id,
                venta: {
                  sucursalId: otroInv.sucursalId,
                  fecha: { gte: hace30Dias },
                  estado: 'COMPLETADA',
                },
              },
              select: { cantidad: true },
            });
            const otroTotalVendido = otroVentasDetalle.reduce(
              (sum, item) => sum + item.cantidad,
              0,
            );
            const otroPromedioVentas =
              otroTotalVendido > 0 ? otroTotalVendido / 30 : 2.0;
            const otroStockObjetivo = otroPromedioVentas * diasObjetivo;

            const exceso = otroInv.existencia - otroStockObjetivo;
            if (exceso >= cantidadSugerida) {
              tipoOrigen = 'TRANSFERENCIA';
              origenSugeridoId = otroInv.sucursalId;
              origenSugeridoNombre = otroInv.sucursal.nombre;
              detalleRazon = `Exceso de stock en ${otroInv.sucursal.nombre} (${otroInv.existencia} unidades vs stock objetivo de ${otroStockObjetivo.toFixed(1)})`;
              break;
            }
          }

          if (tipoOrigen === 'CD' && plantaPrincipal) {
            const CDInv = await this.prisma.inventario.findUnique({
              where: {
                productoId_sucursalId: {
                  productoId: prod.id,
                  sucursalId: plantaPrincipal.id,
                },
              },
            });
            const CDStock = CDInv ? CDInv.existencia : 0;
            if (CDStock < cantidadSugerida) {
              if (prod.marca === 'Lácteos ERP') {
                tipoOrigen = 'PRODUCCION';
                origenSugeridoId = null;
                origenSugeridoNombre = 'Línea de Producción Interna';
                detalleRazon =
                  'Stock insuficiente en CD. Requiere programar orden de producción.';
              } else {
                tipoOrigen = 'COMPRA';
                origenSugeridoId = null;
                origenSugeridoNombre = 'Proveedor Externo';
                detalleRazon =
                  'Stock insuficiente en CD. Requiere generar orden de compra a proveedor.';
              }
            }
          }

          propuestas.push({
            sucursalId: suc.id,
            sucursalNombre: suc.nombre,
            productoId: prod.id,
            productoSku: prod.sku,
            productoNombre: prod.descripcion,
            stockActual: parseFloat(stockActual.toFixed(2)),
            promedioVentasDiarias: parseFloat(promedioVentasDiarias.toFixed(2)),
            diasInventario: parseFloat(diasInventario.toFixed(1)),
            stockObjetivo: parseFloat(stockObjetivo.toFixed(1)),
            cantidadSugerida,
            tipoOrigen,
            origenSugeridoId,
            origenSugeridoNombre,
            detalleRazon,
            alertaRiesgo: diasInventario <= 2 ? 'CRITICO' : 'STOCK_BAJO',
          });
        }
      }
    }

    return propuestas;
  }
}
