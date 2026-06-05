# Manual del Sistema - Lácteos ERP

Este manual documenta el funcionamiento general y operativo del sistema de gestión comercial e inventarios **Lácteos ERP**. El sistema integra la venta en caja (POS), control de stock físico, trazabilidad térmica (IoT), el ciclo completo de compras y pagos a proveedores (Procure-to-Pay), y los nuevos módulos de Producción y Control de Calidad alimentaria.

---

## Índice
1. [Roles y Permisos del Sistema](#1-roles-y-permisos-del-sistema)
2. [Módulo de Punto de Venta (POS)](#2-módulo-de-punto-de-venta-pos)
3. [Módulo de Inventario y Control de Lotes](#3-módulo-de-inventario-y-control-de-lotes)
4. [Monitoreo de Cadena de Frío IoT](#4-monitoreo-de-cadena-de-frío-iot)
5. [Gestión de Compras (Órdenes de Compra)](#5-gestión-de-compras-órdenes-de-compra)
6. [Ciclo de Cuentas por Pagar (Procure-to-Pay)](#6-ciclo-de-cuentas-por-pagar-procure-to-pay)
7. [Historial y Reporte de Ventas](#7-historial-y-reporte-de-ventas)
8. [Asistente Inteligente ERP AI](#8-asistente-inteligente-erp-ai)
9. [Módulo de Producción Láctea](#9-módulo-de-producción-láctea)
10. [Módulo de Control de Calidad y Cumplimiento](#10-módulo-de-control-de-calidad-y-cumplimiento)
11. [Chat Operativo](#11-chat-operativo)
12. [Administración de Personal y Auditoría](#12-administración-de-personal-y-auditoría)
13. [Utilidades y Configuración de Tablas Maestras](#13-utilidades-y-configuración-de-tablas-maestras)
14. [Rutas Inteligentes y Reabastecimiento Automático](#14-rutas-inteligentes-y-reabastecimiento-automático)

---

## 1. Roles y Permisos del Sistema

El acceso a los distintos módulos del sistema está restringido según el rol del usuario asignado:

| Rol | POS | Inventario | Cadena de Frío | Compras | Cuentas por Pagar | Producción / Calidad | Utilidades / Config |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ADMINISTRADOR** | Sí | Sí | Sí | Sí | Sí | Sí | Sí (Completo) |
| **SUPERVISOR** | Sí | Sí | Sí | Sí | Sí | Sí | Sí (Solo Lectura) |
| **CALIDAD** | No | Sí (Lectura) | Sí | No | No | Sí (Registro/Auditoría) | No |
| **ALMACEN** | No | Sí | Sí | Sí (Crear/Recibir) | No | Sí (Registro/Mermas) | No |
| **VENDEDOR** | Sí | No | No | No | No | No | No |

---

## 2. Módulo de Punto de Venta (POS)

El Punto de Venta permite realizar ventas presenciales de forma ágil y registrar los ingresos directamente en caja:

*   **Apertura de Caja**: Antes de comenzar a vender, se debe abrir la jornada con un monto inicial en efectivo.
*   **Facturación**:
    *   Búsqueda rápida de productos por SKU, código o nombre.
    *   Selección de tipo de pago: Efectivo, Débito, Crédito, o Transferencia.
*   **Cierre de Caja**: Al término del turno, se realiza el cuadre de caja comparando el efectivo real con las ventas registradas.

---

## 3. Módulo de Inventario y Control de Lotes

Permite controlar las existencias de productos lácteos y perecederos respetando la metodología FEFO (*First Expired, First Out*):

*   **Gestión de Productos**: Registro de SKU, código de barra, descripción, categoría, unidad de medida, costo base y precio de venta.
*   **Clasificación de Tipo de Producto**: Todos los productos están clasificados en una de tres categorías estructurales para separar los activos de producción de los listos para la venta:
    *   **Producto Terminado**: Productos listos para consumo final (ej. Queso Fresco, Leche UHT). Son los únicos artículos visibles y disponibles para la venta en el módulo de Punto de Venta (POS).
    *   **Insumo**: Materiales y aditivos auxiliares para el proceso productivo (ej. azúcar, cultivos lácticos, preparado de fruta, envases).
    *   **Materia Prima**: Ingredientes base críticos para la elaboración (ej. leche cruda).
*   **Control de Lotes**:
    *   Cada ingreso de mercancía crea un lote con su respectiva **fecha de producción** y **fecha de vencimiento**.
    *   El POS descuenta automáticamente del lote más próximo a vencer para reducir pérdidas.
*   **Registro de Mermas**: Opción de dar de baja productos dañados, rotos o vencidos para mantener el stock real al día.

---

## 4. Monitoreo de Cadena de Frío IoT

Monitorea la temperatura en tiempo real para asegurar la calidad microbiológica de los productos lácteos:

*   **Sensores IoT**: Lecturas automáticas de temperatura cada pocos minutos.
*   **Alertas Térmicas**: Si la temperatura supera el límite seguro de forma sostenida, el sistema gatilla una alerta visual en el Dashboard.
*   **Acciones Sugeridas**:
    *   *Descuento POS*: Para productos en freezers con fallas temporales leves, el sistema puede sugerir ofertas flash automáticas para acelerar su salida antes de perder la cadena de frío.

---

## 5. Gestión de Compras (Órdenes de Compra)

Centraliza el requerimiento de insumos y mercadería a los proveedores externos:

*   **Creación de Orden de Compra (OC)**: El área de almacén o supervisión crea una OC seleccionando el proveedor, sucursal de destino, la **Fecha Estimada de Entrega** (para registrar la fecha solicitada o acordada de entrega) y la lista de productos con costos unitarios.
*   **Fecha de Entrega y Alertas**: El sistema muestra la fecha estimada de arribo y resalta en rojo las órdenes pendientes que ya superaron dicho plazo sin ser recibidas por completo.
*   **Recepción de Mercadería**:
    *   **Recepción Total**: Marca todos los productos como recibidos e incrementa el stock.
    *   **Recepción Parcial**: Permite registrar cantidades menores a las solicitadas. La OC cambia a estado `PARCIAL` hasta que llegue el resto del pedido, controlando el saldo pendiente.

---

## 6. Ciclo de Cuentas por Pagar (Procure-to-Pay)

Este módulo cierra el ciclo administrativo desde que se recibe la mercadería hasta que se concilia el pago al proveedor.

*   **Términos de Pago**: Define la cantidad de días de plazo para pagar (ej. *Contado*, *Crédito 30 días*, *Crédito 60 días*).
*   **Ficha del Proveedor**: Asocia términos de pago por defecto y sus **Datos Bancarios de Transferencia** (Banco, Tipo de Cuenta, Nro de Cuenta, etc.).
*   **Registrar Factura de Compra**: Permite cargar facturas vinculadas a una Orden de Compra (`RECIBIDA` o `PARCIAL`) o mediante facturación directa, calculando el vencimiento en base a las condiciones acordadas.
*   **Monitoreo y Antigüedad**: Gráficos y listas con saldo pendiente, facturas vencidas y reportes de antigüedad de deuda.
*   **Conciliación de Pagos**: Registra abonos parciales o pagos totales usando transferencia (con ID de transacción), cheque físico o efectivo de caja chica.

---

## 7. Historial y Reporte de Ventas

El sistema permite visualizar, auditar y filtrar todo el registro histórico de facturas de caja:

*   **Periodo de Ventas**: Muestra por defecto las ventas del mes en curso, con selectores de fecha de inicio y fecha final para definir rangos personalizados.
*   **Filtros Administrativos**: Si el usuario está logueado como ADMINISTRADOR o SUPERVISOR, tiene la capacidad de filtrar el reporte por cualquier sucursal activa. Los usuarios con menor rango solo pueden visualizar el historial de su propia sucursal asignada.
*   **KPIs del Negocio**: Calcula automáticamente el monto acumulado de ventas, la cantidad de transacciones (tickets) del periodo seleccionado y el ticket promedio por compra.
*   **Breakdown de Ticket**: Permite consultar el detalle individual de cada venta: cajero a cargo, cliente (nombre y rut/documento), desglose de ítems, precio cobrado y los lotes específicos de mercadería asignados.

---

## 8. Asistente Inteligente ERP AI

El sistema incluye a **ERP AI**, un agente conversacional inteligente disponible para administradores y supervisores:

*   **Consultas Naturales**: Puede preguntarle directamente sobre inventario, ventas, mermas u órdenes de compra (ej. *"¿Qué productos están con stock crítico hoy?"*).
*   **Análisis Predictivo de Stock**: Le permite consultar inventarios mínimos recomendados según las ventas históricas de las últimas semanas.
*   **Seguridad**: El asistente filtra y restringe automáticamente la información mostrada según el rol y sucursal del usuario logueado.

---

## 9. Módulo de Producción Láctea

El módulo de **Producción Láctea** permite digitalizar el ciclo de manufactura del negocio, desde la formulación y costeo de recetas base hasta el control físico de rendimientos y desperdicios.

### Pestaña 1: Recetario Maestro
*   **Propósito**: Actúa como base de datos de fórmulas para todos los productos finales elaborados en planta (ej. Queso Chanco, Queso Mozzarella, Leche en Botella, Mantequilla).
*   **Funcionalidades**:
    *   **Crear y Editar Receta**: Permite definir un producto terminado, su rendimiento estándar esperado y el costo unitario estimado.
    *   **Ingredientes e Insumos**: Permite desglosar de manera exacta la lista de materias primas e insumos requeridos (ej. leche cruda, cuajo, sal, envases) con sus respectivas cantidades y unidades de medida.
    *   **Cálculo de Costo**: Estima automáticamente el costo de producción acumulando los costos base de los insumos seleccionados.

### Pestaña 2: Órdenes de Producción (OP)
*   **Propósito**: Planificar y monitorear la ejecución en piso de cada lote de manufactura.
*   **Flujo de Trabajo y Estados**:
    1.  **Planificada**: Se registra la receta a elaborar, la sucursal de destino, la cantidad planificada y el operario responsable. El sistema bloquea preventivamente los ingredientes requeridos del stock.
    2.  **En Proceso**: El operario inicia la preparación. La orden cambia a este estado y las materias primas se consumen formalmente en inventario.
    3.  **Completada**: Al finalizar el proceso, se abre un modal de registro donde se ingresa:
        *   **Cantidad Real Producida**: Total de producto terminado obtenido.
        *   **Número de Lote**: Un código identificador único para la trazabilidad.
        *   **Mermas Declaradas**: Desechos generados específicamente en el proceso (ej. evaporación de suero, pérdidas por derrame).
    4.  **Rendimiento (%)**: El sistema calcula y muestra un indicador de eficiencia porcentual de la orden comparando la producción planificada con la real.

### Pestaña 3: Control de Mermas (Desechos)
*   **Propósito**: Registrar y auditar todas las pérdidas de stock de insumos o producto final que ocurran fuera de las ventas.
*   **Funcionalidades**:
    *   **Historial de Mermas**: Tabla de auditoría con la fecha, el producto afectado, el tipo de merma, la cantidad, el motivo y el usuario responsable.
    *   **Registro Manual**: Permite declarar mermas puntuales seleccionando un producto, el motivo (ej. *EVAPORACION*, *DERRAME*, *MALA_CALIDAD*) y la cantidad a dar de baja directamente de una sucursal.

---

## 10. Módulo de Control de Calidad y Cumplimiento

Este módulo asegura que la materia prima recibida y los lotes producidos cumplan con los estándares sanitarios y físico-químicos antes de su liberación al cliente.

### Pestaña 1: Recepción e Insumos Lácteos
*   **Propósito**: Auditar la calidad de la leche cruda y demás insumos críticos al ingresar a la planta.
*   **Parámetros Analizados**:
    *   **Temperatura (°C)**: Control esencial para evitar la proliferación de bacterias en la recepción.
    *   **Grasa (%) y Proteína (%)**: Parámetros de calidad láctea estructural.
    *   **Acidez (pH)**: Nivel físico-químico del insumo.
    *   **Presencia de Antibióticos (Sí/No)**: Control de seguridad alimentaria crítico; la leche con trazas de antibióticos es rechazada de inmediato.
*   **Firma Digital**: Exige al inspector realizar una firma manual digitalizada en pantalla (canvas de firma) antes de aprobar o rechazar el lote de insumo, asegurando la responsabilidad y el no repudio.

### Pestaña 2: Auditorías en Proceso y Lotes
*   **Propósito**: Control de calidad físico-químico a mitad del proceso de producción o en el producto ya terminado antes de despacharse al POS.
*   **Funcionalidades**:
    *   **Inspección del Lote**: Registro del pH final del lote de queso/leche, su temperatura de empaque y el cumplimiento de parámetros críticos específicos de la receta.
    *   **Liberación de Lotes**: Si el lote es APROBADO, se marca como liberado en inventario y queda disponible para su venta en el POS. Si es RECHAZADO, se bloquea y se inicia un reporte de no conformidad.

### Pestaña 3: Incidencias y No Conformidades (NC)
*   **Propósito**: Centralizar, reportar y hacer seguimiento a las fallas de calidad o desviaciones sanitarias en la cadena de valor.
*   **Flujo de Trabajo**:
    1.  **Reportar NC**: Permite registrar desviaciones de tipo producción o almacenamiento, asociando la incidencia a una orden de producción o un lote específico.
    2.  **Registro de Evidencia**: El inspector puede simular y subir una captura fotográfica digital como evidencia del defecto físico detectado.
    3.  **Resolución y Acciones Correctivas**: La no conformidad permanece como *ABIERTA* hasta que un supervisor analice la falla, registre las **Acciones Correctivas** aplicadas en la planta (ej. descarte de lote, recalibración de pasteurizadora) y cierre formalmente el ticket como *RESUELTA*.

---

## 11. Chat Operativo

El módulo de **Chat Operativo** facilita la coordinación instantánea y la resolución de incidencias en tiempo real entre sucursales y la administración general del sistema (HQ).

*   **Canal General (`#general`)**: Sala de chat corporativa abierta de forma global. Todos los usuarios logueados del sistema pueden enviar y leer mensajes en este espacio.
*   **Canales de Sucursal (`#nombre-sucursal`)**: Salas de chat privadas destinadas a la coordinación interna de cada sucursal:
    *   Los operarios y cajeros asignados a una sucursal solo pueden acceder y chatear en su respectivo canal de sucursal.
    *   Los roles directivos (`ADMINISTRADOR` y `SUPERVISOR`) tienen acceso visual y de escritura en todos los canales de sucursales para dar soporte.
*   **Identificación Visual**: Para facilitar el reconocimiento de los mensajes, cada burbuja de chat muestra el nombre del empleado, su sucursal de origen (en el canal general) y una etiqueta coloreada según su rol jerárquico.

---

## 12. Administración de Personal y Auditoría

Este módulo (accesible bajo **Auditoría y Personal**) centraliza la supervisión de usuarios y el registro inmutable de acciones realizadas en el ERP para auditorías internas.

*   **Gestión de Personal**:
    *   *Alta y Modificación de Usuarios*: Permite registrar nuevos empleados asignándoles Nombre, Correo Electrónico (el cual sirve de credencial de inicio de sesión), Rol, Sucursal de trabajo y Estado (Activo o Inactivo).
    *   *Blanqueo de Clave*: Los administradores pueden forzar el cambio de contraseña de cualquier usuario sin necesidad de conocer su clave actual.
*   **Bitácora de Auditoría**:
    *   Muestra un registro tabular no modificable de todas las transacciones críticas del ERP (ej. `ELIMINAR_ORDEN_COMPRA`, `REGISTRAR_PAGO`, `CREAR_ROL`).
    *   Cada fila detalla el nombre del usuario responsable, la fecha exacta, la acción, el módulo afectado y un payload de detalles en formato JSON con la información exacta del cambio.

---

## 13. Utilidades y Configuración de Tablas Maestras

El panel de **Utilidades** agrupa las configuraciones globales, catálogos estructurales y seguridad del sistema.

*   **Pestaña 1: Sucursales**: Registro, edición y desactivación de sucursales. Cada local comercial o bodega cuenta con código único, dirección, teléfono y correo propio.
*   **Pestaña 2: Categorías de Producto**: Mantenimiento del catálogo para clasificar productos. Permite asociar categorías a tipos estructurales específicos (Producto Terminado, Insumo, Materia Prima).
*   **Pestaña 3: Unidades de Medida**: Registro de unidades de empaque y volumen (ej. litros, gramos, unidades) utilizadas para cuantificar materias primas y existencias.
*   **Pestaña 4: Roles y Permisos**:
    *   Matriz dinámica de seguridad donde se pueden crear nuevos roles personalizados y activar/desactivar sus permisos operativos mediante checkboxes.
    *   Los roles del sistema preestablecidos de fábrica no pueden ser eliminados para proteger la integridad estructural de la aplicación.
*   **Pestaña 5: Configuración de IA**:
    *   Permite cargar y guardar la API Key de OpenAI para dar vida a **Vaquita AI**.
    *   Permite seleccionar el modelo de lenguaje activo (ej. `gpt-4o-mini`, `gpt-4o`) para controlar el costo y la calidad de las respuestas del asistente de operaciones.

---

## 14. Rutas Inteligentes y Reabastecimiento Automático

Este módulo gestiona la optimización física de la cadena de distribución del negocio, calculando rutas de entrega eficientes y reabasteciendo de manera automática o manual el stock de los locales de venta de Santa Ana.

### Rutas Inteligentes (VRP/TSP)
*   **Propósito**: Diseñar y asignar recorridos de distribución eficientes desde el Centro de Distribución (CD) principal (código `SUC-001`) hacia las diferentes sucursales de venta.
*   **Algoritmo VRP/TSP**: Calcula la secuencia óptima de entrega para la flota vehicular, reduciendo la distancia total de viaje, el consumo de combustible y asegurando el paso ordenado por los puntos de destino.
*   **Visualización en Mapa**: Proporciona un mapa cartográfico interactivo de alto contraste que ilustra las posiciones geográficas de las sucursales, camiones de reparto activos y las líneas de ruta trazadas en Santa Ana.

### Cálculo de Reabastecimiento
*   **Decisión de Reabastecer**: Se genera una propuesta de reabastecimiento para una sucursal si el inventario de un producto en ella es menor que su **Stock Objetivo**.
*   **Fórmula del Stock Objetivo**: El Stock Objetivo se define como el valor máximo entre:
    1.  **Demanda por Proyección de Ventas**: Las ventas diarias promedio de los últimos 30 días multiplicadas por los días de cobertura objetivo de la categoría del producto (Leche: 5 días, Yogurt: 7 días, Quesos: 10 días, Mantequilla: 15 días). Si no hay ventas, se asume un promedio de venta base de 2 unidades/día.
    2.  **Stock Mínimo de Seguridad (`existMin`)**: El umbral configurado físicamente por los gerentes en la tabla de inventario. Esto garantiza que las tiendas en estado de **Stock Crítico** sean abastecidas preventivamente sin depender de que exista un histórico de ventas reciente.
*   **Flujo FEFO de Origen**: Al autorizar y procesar una propuesta de transferencia, el sistema localiza el stock disponible en el origen (CD u otras tiendas) y prioriza la extracción utilizando los lotes con la fecha de vencimiento más próxima (*First Expired, First Out*).
*   **Procesamiento Automático en Segundo Plano**: Si la configuración de auto-reabastecimiento está activada (`autoReplenishEnabled`), el sistema ejecutará periódicamente en segundo plano el cálculo y registrará directamente las transferencias en estado `PENDIENTE` para asegurar el flujo logístico continuo.

