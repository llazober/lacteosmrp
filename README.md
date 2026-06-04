# Lácteos ERP - La Vaquita 🥛🧀

Sistema integral de Planificación de Recursos Empresariales (ERP) y manufactura para la cadena de distribución y producción de lácteos **La Vaquita**.

---

## 📂 Estructura del Repositorio

*   **[`/backend`](file:///c:/Users/luisl/LacteosMrp/backend)**: API REST construida con NestJS, Prisma ORM y bases de datos relacionales (SQLite / PostgreSQL).
*   **[`/frontend`](file:///c:/Users/luisl/LacteosMrp/frontend)**: Aplicación web interactiva de cliente SPA construida con React, TypeScript y Material UI (MUI).
*   **[`deployment_guide.md`](file:///c:/Users/luisl/LacteosMrp/deployment_guide.md)**: Guía detallada paso a paso para desplegar el frontend y backend en la nube utilizando Easypanel y Docker.
*   **[`diseno_arquitectura_mrp.md`](file:///c:/Users/luisl/LacteosMrp/diseno_arquitectura_mrp.md)**: Documentación de arquitectura, diseño de base de datos e integraciones del sistema.
*   **[`backend/manual_sistema.md`](file:///c:/Users/luisl/LacteosMrp/backend/manual_sistema.md)**: Manual operativo y guía de usuario detallada por cada módulo funcional.

---

## 🧠 Mantenimiento del Manual Operativo e Inteligencia Artificial

> [!IMPORTANT]
> **REGLA DE ORO DE MANTENIMIENTO (Súper Asistente "Vaquita AI"):**
> El sistema incluye un Asistente de IA en tiempo real para apoyar a los operarios. Este asistente lee **dinámicamente** el archivo [`backend/manual_sistema.md`](file:///c:/Users/luisl/LacteosMrp/backend/manual_sistema.md) desde el disco para resolver dudas sobre los procesos de la empresa.
> 
> **Cada vez que agregues, elimines o cambies una funcionalidad o módulo en el sistema:**
> 1. Actualiza la sección correspondiente dentro de [`backend/manual_sistema.md`](file:///c:/Users/luisl/LacteosMrp/backend/manual_sistema.md) describiendo el nuevo flujo operativo en español claro.
> 2. Haz un commit y súbelo a GitHub.
> 3. Realiza un **redeploy del servicio Backend** (`lacteos-api`) en Easypanel.
>
> Al hacer esto, la IA aprenderá instantáneamente el nuevo comportamiento sin requerir ninguna reprogramación.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend**: React (Vite), TypeScript, Material UI, Recharts, Socket.IO Client.
*   **Backend**: NestJS, Prisma, Socket.IO, OpenAI API SDK.
*   **Base de datos**: SQLite (Desarrollo local) y PostgreSQL (Producción / Easypanel).
