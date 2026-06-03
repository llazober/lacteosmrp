# Guía de Despliegue en la Nube - La Vaquita

Esta guía contiene los pasos necesarios para llevar la aplicación **La Vaquita** a producción utilizando **GitHub** y **Easypanel** (siguiendo una arquitectura similar a la utilizada en Kanban Board).

---

## 1. Preparación de Git y GitHub

Debido a que el proyecto local no está inicializado con Git, el primer paso es crear el repositorio local y subirlo a GitHub.

### Paso A: Inicializar Git Localmente
Abre una terminal en tu computadora, posiciónate en la raíz del proyecto (`c:\Users\luisl\lavaquita`) y ejecuta:

```bash
# Inicializar repositorio git
git init

# Agregar todos los archivos (el archivo .gitignore de la raíz evitará subir node_modules y bases de datos locales)
git add .

# Crear el commit inicial
git commit -m "feat: preparar proyecto para despliegue en Easypanel con Docker"
```

### Paso B: Subir a GitHub
1. Entra a tu cuenta en [GitHub](https://github.com/) y crea un nuevo repositorio llamado **`lavaquita`** (puede ser privado o público).
2. Vincula tu repositorio local con GitHub y sube el código ejecutando:

```bash
# Cambiar a la rama principal (main)
git branch -M main

# Vincular al repositorio de GitHub (reemplaza con tu URL real)
git remote add origin https://github.com/TU_USUARIO/lavaquita.git

# Subir los archivos
git push -u origin main
```

---

## 2. Despliegue en Easypanel

En tu instancia de **Easypanel**, crea un nuevo proyecto llamado **`La Vaquita`** y agrega dos servicios tipo **App** (uno para el Backend y otro para el Frontend).

---

### Servicio A: Backend (`lavaquita-api`)

Este servicio correrá la API de NestJS y mantendrá la base de datos SQLite.

1. **Source (Origen)**:
   - Tipo: **GitHub**.
   - Repositorio: Selecciona tu repositorio `lavaquita` y la rama `main`.
2. **Build (Construcción)**:
   - Directorio de construcción (Build Path): `/backend`
   - Ruta del Dockerfile (Dockerfile Path): `/backend/Dockerfile`
3. **Environment (Variables de Entorno)**:
   - `PORT`: `3000`
   - `DATABASE_URL`: `file:/data/dev.db` (Esto apuntará la base de datos al volumen persistente).
   - `JWT_SECRET`: Ingresa una clave segura aleatoria para firmar los tokens de sesión.
4. **Volumes (Persistencia de Datos)**:
   - Para evitar que la base de datos SQLite se borre al actualizar o reiniciar el contenedor, debes crear un volumen persistente.
   - En la sección **Volumes** de Easypanel, agrega uno con los siguientes datos:
     - Nombre del Volumen: `lavaquita-db`
     - Ruta de Montaje (Mount Path): `/data`
5. **Domains (Dominios)**:
   - Configura un dominio o subdominio para la API (por ejemplo: `api.lavaquita.cl` o usa el dominio generado por Easypanel).
6. **Inicializar Base de Datos (Semilla/Seed)**:
   - Una vez desplegado con éxito por primera vez, puedes abrir la **Consola** de este servicio en Easypanel y ejecutar el siguiente comando para poblar la base de datos con los datos iniciales y usuarios de prueba:
     ```bash
     npx prisma db seed
     ```

---

### Servicio B: Frontend (`lavaquita-web`)

Este servicio compilará la app React y la servirá mediante Nginx.

1. **Source (Origen)**:
   - Tipo: **GitHub**.
   - Repositorio: Selecciona tu repositorio `lavaquita` y la rama `main`.
2. **Build (Construcción)**:
   - Directorio de construcción (Build Path): `/frontend`
   - Ruta del Dockerfile (Dockerfile Path): `/frontend/Dockerfile`
3. **Environment (Variables de Entorno)**:
   - `VITE_API_URL`: `https://TU_DOMINIO_API/api` (Reemplaza con el dominio configurado en el servicio backend, por ejemplo: `https://api.lavaquita.cl/api`).
4. **Domains (Dominios)**:
   - Configura tu dominio principal para los usuarios (por ejemplo: `lavaquita.cl` o el dominio por defecto de Easypanel).
