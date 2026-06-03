# Manual del Sistema - La Vaquita

Este manual documenta el funcionamiento general y operativo del sistema de gestión comercial e inventarios **La Vaquita**. El sistema integra la venta en caja (POS), control de stock físico, trazabilidad térmica (IoT), y el ciclo completo de compras y pagos a proveedores (Procure-to-Pay).

---

## Índice
1. [Roles y Permisos del Sistema](#1-roles-y-permisos-del-sistema)
2. [Módulo de Punto de Venta (POS)](#2-módulo-de-punto-de-venta-pos)
3. [Módulo de Inventario y Control de Lotes](#3-módulo-de-inventario-y-control-de-lotes)
4. [Monitoreo de Cadena de Frío IoT](#4-monitoreo-de-cadena-de-frío-iot)
5. [Gestión de Compras (Órdenes de Compra)](#5-gestión-de-compras-órdenes-de-compra)
6. [Ciclo de Cuentas por Pagar (Procure-to-Pay)](#6-ciclo-de-cuentas-por-pagar-procure-to-pay)
7. [Historial y Reporte de Ventas](#7-historial-y-reporte-de-ventas)
8. [Asistente Inteligente Vaquita AI](#8-asistente-inteligente-vaquita-ai)

---

## 1. Roles y Permisos del Sistema

El acceso a los distintos módulos del sistema está restringido según el rol del usuario asignado:

| Rol | POS | Inventario | Cadena de Frío | Compras | Cuentas por Pagar | Utilidades / Config |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **ADMINISTRADOR** | Sí | Sí | Sí | Sí | Sí | Sí (Completo) |
| **SUPERVISOR** | Sí | Sí | Sí | Sí | Sí | Sí (Solo Lectura) |
| **ALMACEN** | No | Sí | Sí | Sí (Crear/Recibir) | No | No |
| **VENDEDOR** | Sí | No | No | No | No | No |

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

### Paso 1: Configurar Términos de Pago y Proveedores
Antes de registrar facturas, es necesario configurar las condiciones de crédito en **Utilidades**:
1.  **Términos de Pago**: Define la cantidad de días de plazo para pagar (ej. *Contado*, *Crédito 30 días*, *Crédito 60 días*).
2.  **Ficha del Proveedor**:
    *   Asocia un término de pago por defecto al proveedor.
    *   Registra sus **Datos Bancarios de Transferencia** (Banco, Tipo de Cuenta, Nro de Cuenta, RUT y Nombre del Titular).

### Paso 2: Registrar Factura de Compra
Al recibir la factura física o electrónica del proveedor, regístrela en **Cuentas por Pagar > Registrar Factura**:
*   **Factura asociada a OC**: Seleccione la Orden de Compra en estado `RECIBIDA` o `PARCIAL`. Esto auto-completará el proveedor y los ítems con sus costos.
*   **Facturación Directa**: Si no hay una OC, seleccione el proveedor e ingrese manualmente las líneas de la factura.
*   *Cálculo de Vencimiento*: El sistema calculará automáticamente la **Fecha de Vencimiento** sumando los días del término de pago a la fecha de emisión.

### Paso 3: Monitoreo de Deuda (KPIs y Antigüedad)
El sistema ofrece un panel financiero con tres indicadores clave:
*   **Deuda Total Pendiente**: Suma de los saldos de todas las facturas en estado `PENDIENTE` o `PAGADA_PARCIAL`.
*   **Deuda Vencida**: Monto de facturas no pagadas cuya fecha de vencimiento es menor a la fecha actual. Éstas se marcan con un icono de advertencia rojo ⚠️ en la tabla.
*   **Pagos Realizados**: Historial acumulado de abonos.

### Paso 4: Conciliación de Pagos (Egresos)
Para registrar un pago, presione el botón **Pagar** en la fila de la factura:
1.  **Datos de Transferencia**: El modal mostrará automáticamente los datos bancarios del proveedor para facilitar la operación en su portal bancario.
2.  **Método de Pago**:
    *   **Transferencia o Depósito**: Requiere ingresar el código de referencia u operación.
    *   **Cheque**: Permite registrar el número de cheque, el banco emisor y su fecha de cobro/vencimiento.
    *   **Efectivo**: Registra el egreso directamente de la caja chica del local.
3.  **Abono Parcial o Pago Total**: Puede ingresar un monto menor al saldo (la factura quedará como `PAGADA_PARCIAL`) o el monto total (la factura pasará a `PAGADA`).

---

## 7. Historial y Reporte de Ventas

El sistema permite visualizar, auditar y filtrar todo el registro histórico de facturas de caja:

*   **Periodo de Ventas**: Muestra por defecto las ventas del mes en curso, con selectores de fecha de inicio y fecha final para definir rangos personalizados.
*   **Filtros Administrativos**: Si el usuario está logueado como ADMINISTRADOR o SUPERVISOR, tiene la capacidad de filtrar el reporte por cualquier sucursal activa. Los usuarios con menor rango solo pueden visualizar el historial de su propia sucursal asignada.
*   **KPIs del Negocio**: Calcula automáticamente el monto acumulado de ventas, la cantidad de transacciones (tickets) del periodo seleccionado y el ticket promedio por compra.
*   **Breakdown de Ticket**: Permite consultar el detalle individual de cada venta: cajero a cargo, cliente (nombre y rut/documento), desglose de ítems, precio cobrado y los lotes específicos de mercadería asignados.

---

## 8. Asistente Inteligente Vaquita AI

El sistema incluye a **Vaquita AI**, un agente conversacional inteligente disponible para administradores y supervisores:

*   **Consultas Naturales**: Puede preguntarle directamente sobre inventario, ventas, mermas u órdenes de compra (ej. *"¿Qué productos están con stock crítico hoy?"*).
*   **Análisis Predictivo de Stock**: Le permite consultar inventarios mínimos recomendados según las ventas históricas de las últimas semanas.
*   **Seguridad**: El asistente filtra y restringe automáticamente la información mostrada según el rol y sucursal del usuario logueado.
