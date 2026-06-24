# 📋 Lista de Tareas Pendientes (Backlog) - Lácteos ERP

A continuación se listan las mejoras y funcionalidades pendientes por consultar e implementar en el sistema:

---

## 🚀 Planificación y Producción (MRP)

### 1. Selección de Lógica de Loteado en Recetario Maestro para MRP
*   **Descripción:** Permitir seleccionar en el Recetario Maestro cómo debe el MRP calcular las cantidades a producir cuando la necesidad sugerida no coincide exactamente con el tamaño de un lote (batch).
*   **Opciones a configurar por receta:**
    1.  **Cantidades Continuas (Exactas):** Producir la cantidad exacta del déficit calculado (comportamiento actual). Ejemplo: si el déficit es de 70 lbs, sugerir 70 lbs.
    2.  **Lotes Completos (Múltiplos del Batch):** Ajustar la cantidad sugerida para que sea siempre un múltiplo exacto del rendimiento esperado (tamaño del lote/batch). Ejemplo: si el batch es de 50 lbs y el déficit es de 70 lbs, sugerir 100 lbs (2 lotes completos).
*   **Impacto de Desarrollo:**
    *   **Base de datos:** Agregar un campo en el modelo `Receta` de `schema.prisma` (ej. `ajustarPorLotes: Boolean` o `tipoLoteo: String`).
    *   **Frontend (Recetas):** Modificar la vista de creación y edición de recetas para incluir un selector con esta opción.
    *   **Backend (Planificación):** Modificar la función `calcularPlanificacion` en `produccion.controller.ts` para que, al procesar las sugerencias de producción de cada producto, aplique la lógica seleccionada:
        $$\text{Cantidad Sugerida} = \text{Math.ceil}(\text{Déficit} / \text{Cantidad Esperada}) \times \text{Cantidad Esperada}$$
    *   **Creación Manual de OP:** Al crear manualmente una Orden de Producción (`crearOrdenProduccion` en el backend o en el formulario del frontend), si la receta tiene activada la opción de **Lotes Completos**, se debe validar que la cantidad ingresada sea múltiplo exacto del rendimiento esperado (`cantidadEsperada`), rechazando la creación con un mensaje aclaratorio si no lo es (o ajustándola/advirtiendo al usuario).

