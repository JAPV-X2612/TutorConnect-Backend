# TutorConnect Backend

Backend del sistema **TutorConnect** desarrollado con NestJS siguiendo una arquitectura de monolito modular.

---

## 🚀 Inicio Rápido

**¿Primera vez aquí?** Empieza con estas guías:

| 📖 Guía | 📝 Descripción | 👥 Para Quién |
|---------|---------------|---------------|
| **[RESUMEN.md](./RESUMEN.md)** | 🌟 **Comienza aquí** - Estado del proyecto y overview | Todos |
| **[SETUP.md](./SETUP.md)** | Guía completa de configuración y troubleshooting | Desarrolladores |
| **[QUICKSTART.md](./QUICKSTART.md)** | Inicio rápido en 3 pasos | Principiantes |
| **[DOCKER.md](./DOCKER.md)** | Guía detallada de Docker | Usuarios Docker |
| **[RUN-WITHOUT-DOCKER.md](./RUN-WITHOUT-DOCKER.md)** | Ejecutar sin Docker | Sin Docker |

### Comandos Esenciales

```bash
# Verificar que todo está configurado
npm run verify

# Con Docker (requiere Docker Desktop)
npm run docker:up          # Iniciar todo
npm run docker:logs        # Ver logs

# Sin Docker (requiere PostgreSQL local)
npm run start:dev          # Modo desarrollo
```

**Verificar que funciona**: http://localhost:3000/health

---

## 📋 Descripción

TutorConnect es una plataforma diseñada para conectar estudiantes con tutores especializados. Este repositorio contiene el backend que proporciona APIs REST para:

- Gestión de usuarios (estudiantes y tutores)
- Autenticación externa
- Perfiles académicos de tutores
- Búsqueda y matching inteligente con IA
- Sistema de reservas de tutorías

## ✅ Estado del Proyecto

- ✅ **Docker**: Completamente configurado
- ✅ **PostgreSQL**: Integrado y listo
- ✅ **TypeORM**: Actualizado a versión 0.3.x
- ✅ **Health Check**: API funcionando
- ✅ **Dependencias**: Resueltas y compatibles con NestJS 11

## 🏗️ Arquitectura

El proyecto implementa un **monolito modular** organizado por dominios de negocio, facilitando la escalabilidad y mantenimiento del código.

### Estructura de Directorios

```
src/
├── app.module.ts              # Módulo raíz que orquesta todos los módulos
├── main.ts                    # Punto de entrada de la aplicación
├── config/                    # Configuración centralizada
│   ├── config.module.ts       # Módulo de configuración global
│   └── configuration.ts       # Carga de variables de entorno
├── database/                  # Módulo de base de datos
│   ├── database.module.ts
│   └── database.service.ts
├── common/                    # Recursos compartidos
│   ├── filters/              # Filtros de excepción HTTP
│   ├── interceptors/         # Interceptores globales
│   ├── pipes/                # Pipes de validación
│   ├── guards/               # Guards de autorización
│   └── dto/                  # DTOs compartidos entre módulos
└── modules/                   # Módulos de dominio
    ├── health/               # ✅ Health check (IMPLEMENTADO)
    ├── users/                # Gestión de Usuarios
    ├── auth/                 # Autenticación Externa
    ├── tutors/               # Perfil Académico de Tutores
    ├── search/               # Búsqueda y Matching con IA
    └── bookings/             # Reserva de Tutorías
```

## 🔧 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js**: >= 18.x (recomendado: 22.x)
- **npm**: >= 9.x
- **NestJS CLI**: >= 11.x (opcional, para desarrollo)

### Verificar versiones

```bash
node --version
npm --version
```

### Instalar NestJS CLI (opcional)

```bash
npm install -g @nestjs/cli
```

## 📦 Dependencias Principales

El proyecto utiliza las siguientes dependencias clave:

### Dependencias de Producción

- **@nestjs/core**: Framework principal de NestJS
- **@nestjs/common**: Utilidades comunes de NestJS
- **@nestjs/platform-express**: Adaptador para Express
- **@nestjs/config**: Gestión de configuración y variables de entorno
- **reflect-metadata**: Metadata reflection API (requerido por TypeScript decorators)
- **rxjs**: Programación reactiva

### Dependencias de Desarrollo

- **TypeScript**: >= 5.x
- **@nestjs/cli**: CLI de NestJS
- **@nestjs/schematics**: Generadores de código
- **ESLint**: Linter de código
- **Prettier**: Formateador de código
- **Jest**: Framework de testing

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd TutorConnect-Backend
```

### 2. Instalar dependencias

```bash
npm install
```

Este comando instalará todas las dependencias definidas en `package.json`, incluyendo:
- Framework NestJS y sus módulos
- TypeScript y herramientas de compilación
- ESLint y Prettier para calidad de código
- Jest para testing

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Windows (PowerShell)
New-Item .env -ItemType File

# Linux/Mac
touch .env
```

Agrega las siguientes variables:

```env
# Servidor
PORT=3000

# Base de Datos (configurar según tu entorno)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tutorconnect
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Autenticación
AUTH_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=3600

# Entorno
NODE_ENV=development
```

⚠️ **Importante**: No subas el archivo `.env` a control de versiones. Ya está incluido en `.gitignore`.

## 🐳 Ejecutar con Docker (Recomendado)

### Requisitos Previos para Docker

- **Docker Desktop**: Última versión
- **Docker Compose**: Incluido en Docker Desktop

### Opción 1: Entorno Completo (App + PostgreSQL)

Esta es la forma más rápida de ejecutar todo el proyecto con base de datos incluida:

```bash
# Construir y ejecutar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f app
docker-compose logs -f postgres
```

Esto iniciará:
- **PostgreSQL** en el puerto `5432`
- **Backend NestJS** en el puerto `3000`

### Opción 2: Solo Base de Datos (para desarrollo local)

Si prefieres ejecutar la aplicación localmente pero usar PostgreSQL en Docker:

```bash
# Iniciar solo PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Luego ejecutar la app localmente
npm run start:dev
```

### Comandos Útiles de Docker

```bash
# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (⚠️ esto borrará los datos de la BD)
docker-compose down -v

# Reconstruir las imágenes
docker-compose up -d --build

# Ver estado de los contenedores
docker-compose ps

# Acceder a la shell de PostgreSQL
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect

# Ver uso de recursos
docker stats
```

### Verificar que Docker Está Funcionando

Después de ejecutar `docker-compose up -d`, verifica:

```bash
# Verificar health check
curl http://localhost:3000/health

# O con PowerShell
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing
```

### Respuesta Esperada con Base de Datos

```json
{
  "status": "ok",
  "timestamp": "2026-02-17T18:05:02.000Z",
  "uptime": 123.45,
  "database": {
    "status": "connected"
  }
}
```

### Configuración de PostgreSQL

Credenciales por defecto (definidas en `docker-compose.yml`):

```
Host: localhost (o 'postgres' desde dentro de Docker)
Puerto: 5432
Base de datos: tutorconnect
Usuario: postgres
Contraseña: postgres123
```

⚠️ **Importante**: Cambia estas credenciales en producción editando el archivo `docker-compose.yml`.

### Conectarse a PostgreSQL desde tu máquina

Puedes usar cualquier cliente de PostgreSQL (DBeaver, pgAdmin, TablePlus, etc.):

```bash
# Con psql desde Docker
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect

# Con psql local (si tienes instalado)
psql -h localhost -p 5432 -U postgres -d tutorconnect
```

## ▶️ Ejecutar el Proyecto (Sin Docker)

### Modo Desarrollo (con hot-reload)

```bash
npm run start:dev
```

Este comando:
- Compila el código TypeScript
- Inicia el servidor en modo watch
- Recarga automáticamente al detectar cambios

### Modo Producción

```bash
# 1. Compilar el proyecto
npm run build

# 2. Ejecutar la versión compilada
npm run start:prod
```

### Modo Normal

```bash
npm run start
```

El servidor estará disponible en: **http://localhost:3000**

## 🧪 Verificar que el Servidor Está Funcionando

### Opción 1: Navegador
Abre tu navegador y visita: http://localhost:3000/health

### Opción 2: cURL (si tienes instalado)
```bash
curl http://localhost:3000/health
```

### Opción 3: PowerShell
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing
```

### Respuesta Esperada

```json
{
  "status": "ok",
  "timestamp": "2026-02-17T18:05:02.000Z",
  "uptime": 123.45
}
```

## 📦 Módulos Disponibles

### ✅ Health Module (Implementado)
- **Ruta**: `GET /health`
- **Descripción**: Verifica el estado del servidor
- **Uso**: Ideal para health checks en Kubernetes/Docker

### 🏗️ Módulos en Desarrollo

Los siguientes módulos tienen la estructura base creada pero requieren implementación:

1. **Users Module** (`/users`)
   - Gestión de perfiles de usuarios
   - CRUD de estudiantes y tutores

2. **Auth Module** (`/auth`)
   - Login/Registro
   - Integración con OAuth2 (Google, Microsoft, etc.)
   - Generación de JWT

3. **Tutors Module** (`/tutors`)
   - Perfiles académicos de tutores
   - Materias, experiencia, disponibilidad
   - Calificaciones y reseñas

4. **Search Module** (`/search`)
   - Búsqueda de tutores por filtros
   - Matching inteligente con IA
   - Recomendaciones personalizadas

5. **Bookings Module** (`/bookings`)
   - Reserva de sesiones de tutoría
   - Gestión de calendario
   - Confirmaciones y cancelaciones

## 🧪 Testing

```bash
# Tests unitarios
npm run test

# Tests en modo watch
npm run test:watch

# Tests end-to-end
npm run test:e2e

# Cobertura de tests
npm run test:cov
```

## 🔍 Linting y Formato

```bash
# Ejecutar ESLint
npm run lint

# Formatear código con Prettier
npm run format
```

## 🗄️ Base de Datos

El proyecto ya tiene **TypeORM** configurado y conectado con **PostgreSQL**.

### Configuración Actual

- **ORM**: TypeORM 0.3.x
- **Base de Datos**: PostgreSQL 16
- **Driver**: pg (node-postgres)

### Estructura del Módulo de Base de Datos

```
src/database/
├── database.module.ts     # Configuración de TypeORM con PostgreSQL
└── database.service.ts    # Servicio con health checks y utilidades
```

### Características Implementadas

✅ Conexión automática con PostgreSQL  
✅ Configuración desde variables de entorno  
✅ Health checks de base de datos  
✅ Logging en desarrollo  
✅ Auto-sincronización en desarrollo (deshabilitada en producción)  

### Crear Entidades

Para crear una nueva entidad, crea un archivo en el módulo correspondiente:

```typescript
// src/modules/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
```

Luego registra la entidad en `database.module.ts`:

```typescript
entities: [User], // Agrega tus entidades aquí
```

### Migrations (Producción)

Para producción, desactiva `synchronize` y usa migraciones:

```bash
# Generar una migración
npm run typeorm migration:generate -- -n MigrationName

# Ejecutar migraciones
npm run typeorm migration:run

# Revertir migración
npm run typeorm migration:revert
```

### Conectar desde un Cliente SQL

Usa las credenciales configuradas en `.env` o `docker-compose.yml`:

```bash
# Desde Docker
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect

# Desde tu máquina (con psql instalado)
psql -h localhost -p 5432 -U postgres -d tutorconnect
```

### Clientes GUI Recomendados

- **pgAdmin**: Cliente oficial de PostgreSQL
- **DBeaver**: Cliente universal gratuito
- **TablePlus**: Cliente moderno (macOS/Windows)
- **DataGrip**: IDE de JetBrains (de pago)

## 📝 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run start` | Inicia el servidor en modo normal |
| `npm run start:dev` | Inicia en modo desarrollo con hot-reload |
| `npm run start:prod` | Inicia en modo producción |
| `npm run build` | Compila el proyecto TypeScript |
| `npm run test` | Ejecuta tests unitarios |
| `npm run test:e2e` | Ejecuta tests end-to-end |
| `npm run test:cov` | Genera reporte de cobertura |
| `npm run lint` | Analiza el código con ESLint |
| `npm run format` | Formatea el código con Prettier |

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| NestJS | 11.x | Framework backend |
| Node.js | 22.x | Runtime JavaScript |
| TypeScript | 5.x | Lenguaje tipado |
| npm | 10.x | Gestor de paquetes |
| ESLint | 9.x | Linter de código |
| Prettier | 3.x | Formateador de código |
| Jest | 29.x | Framework de testing |

## 📚 Próximos Pasos

1. **Configurar Base de Datos**
   - Elegir e integrar TypeORM o Prisma
   - Crear esquema de base de datos
   - Implementar migraciones

2. **Implementar Autenticación**
   - Configurar Passport.js
   - Implementar estrategias JWT y OAuth2
   - Crear guards de autorización

3. **Desarrollar DTOs**
   - Instalar `class-validator` y `class-transformer`
   - Crear DTOs para cada módulo
   - Implementar pipes de validación

4. **Lógica de Negocio**
   - Implementar servicios con lógica real
   - Conectar con base de datos
   - Crear repositorios

5. **Documentación API**
   - Instalar `@nestjs/swagger`
   - Documentar endpoints
   - Generar OpenAPI spec

6. **Testing**
   - Escribir tests unitarios
   - Implementar tests de integración
   - Configurar CI/CD

## 📖 Recursos Útiles

- [Documentación de NestJS](https://docs.nestjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 📄 Licencia

Ver archivo [LICENSE](./LICENSE) para más detalles.
