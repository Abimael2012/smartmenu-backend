# SmartMenu Backend

API REST para la plataforma de menú digital de restaurantes.

## 🚀 Tecnologías

- **Node.js** + **Express** - Servidor web
- **PostgreSQL** (Neon) - Base de datos
- **CORS** - Seguridad de origen cruzado
- **Dotenv** - Gestión de variables de entorno

## 📦 Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/smartmenu-backend.git
cd smartmenu-backend

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env con tus credenciales
cp .env.example .env
# Edita .env y agrega tu DATABASE_URL de Neon

# 4. Ejecutar el servidor
npm start
# El servidor correrá en http://localhost:3000
```

## 🔌 Endpoints Principales

### Obtener menú público
```
GET /api/menu/:restauranteId
```

### Agregar platillo (Admin)
```
POST /api/platillos
Body: { categoria_id, nombre, descripcion, precio, imagen_url }
```

### Actualizar precio
```
PUT /api/platillos/:id/precio
Body: { nuevoPrecio }
```

### Cambiar disponibilidad
```
PATCH /api/platillos/:id/disponibilidad
Body: { disponible: true/false }
```

### Lista completa del admin
```
GET /api/admin/platillos/:restauranteId
```

## ⚠️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require&channel_binding=require
PORT=3000
```

**NUNCA** subas el `.env` a GitHub. Usa `.env.example` como plantilla.

## 🚀 Desplegar en Vercel

1. Push a GitHub
2. Ve a [Vercel.com](https://vercel.com)
3. Conecta tu repositorio
4. En Settings → Environment Variables, agrega `DATABASE_URL`
5. Deploy automático al hacer push

## 📝 Notas de Seguridad

- ✅ Las credenciales van en variables de entorno, no en el código
- ✅ El `.env` está en `.gitignore` (no se sube a GitHub)
- ⚠️ TODO: Agregar autenticación para rutas admin
- ⚠️ TODO: Validar entrada de datos (SQL injection prevention)
