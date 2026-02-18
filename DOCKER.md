# 🐳 Guía de Docker para TutorConnect Backend

Esta guía detalla cómo usar Docker y Docker Compose para ejecutar el proyecto TutorConnect Backend.

## 📋 Requisitos Previos

- **Docker Desktop**: [Descargar aquí](https://www.docker.com/products/docker-desktop/)
- **Docker Compose**: Incluido en Docker Desktop

Verifica la instalación:

```bash
docker --version
docker-compose --version
```

## 🚀 Inicio Rápido

### Ejecutar Todo el Sistema (Recomendado)

```bash
# Iniciar la aplicación y PostgreSQL
npm run docker:up

# Ver los logs
npm run docker:logs

# Detener todo
npm run docker:down
```

## 📦 Servicios Disponibles

### 1. PostgreSQL (Base de Datos)

- **Container**: `tutorconnect-postgres`
- **Puerto**: `5432`
- **Base de datos**: `tutorconnect`
- **Usuario**: `postgres`
- **Contraseña**: `postgres123`

### 2. NestJS Backend (Aplicación)

- **Container**: `tutorconnect-backend`
- **Puerto**: `3000`
- **Health Check**: http://localhost:3000/health

## 🔧 Configuraciones de Docker Compose

### Producción: `docker-compose.yml`

Ejecuta ambos servicios (App + PostgreSQL):

```bash
# Iniciar
docker-compose up -d

# Reconstruir imágenes
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Desarrollo: `docker-compose.dev.yml`

Solo PostgreSQL (ejecuta la app localmente):

```bash
# Iniciar solo la base de datos
docker-compose -f docker-compose.dev.yml up -d

# En otra terminal, ejecutar la app
npm run start:dev
```

## 📝 Comandos Útiles

### Gestión de Contenedores

```bash
# Ver estado de los contenedores
docker-compose ps

# Detener sin eliminar
docker-compose stop

# Iniciar contenedores detenidos
docker-compose start

# Reiniciar servicios
docker-compose restart

# Ver uso de recursos
docker stats
```

### Logs y Debugging

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f app
docker-compose logs -f postgres

# Ver últimas 100 líneas
docker-compose logs --tail=100 app
```

### Gestión de Volúmenes

```bash
# Listar volúmenes
docker volume ls

# Ver detalles del volumen de PostgreSQL
docker volume inspect tutorconnect-backend_postgres_data

# ⚠️ ELIMINAR TODOS LOS DATOS (cuidado)
docker-compose down -v
```

### Acceso a Contenedores

```bash
# Acceder al contenedor de la app
docker exec -it tutorconnect-backend sh

# Acceder al contenedor de PostgreSQL
docker exec -it tutorconnect-postgres sh

# Conectar a PostgreSQL directamente
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect
```

## 🗄️ Trabajar con la Base de Datos

### Conectar desde tu Máquina

**Credenciales:**
```
Host: localhost
Puerto: 5432
Base de datos: tutorconnect
Usuario: postgres
Contraseña: postgres123
```

**Desde psql (si tienes instalado):**

```bash
psql -h localhost -p 5432 -U postgres -d tutorconnect
```

**Desde Docker:**

```bash
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect
```

### Comandos SQL Útiles

```sql
-- Ver todas las tablas
\dt

-- Describir una tabla
\d nombre_tabla

-- Ver todas las bases de datos
\l

-- Salir
\q
```

### Backup y Restore

```bash
# Crear backup
docker exec tutorconnect-postgres pg_dump -U postgres tutorconnect > backup.sql

# Restaurar backup
cat backup.sql | docker exec -i tutorconnect-postgres psql -U postgres -d tutorconnect
```

## 🔍 Verificar que Todo Funciona

### 1. Verificar Contenedores

```bash
docker-compose ps
```

Deberías ver ambos servicios como "Up" y "healthy".

### 2. Verificar API

**Con curl:**
```bash
curl http://localhost:3000/health
```

**Con PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing
```

**Respuesta esperada:**
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

### 3. Verificar Conexión a PostgreSQL

```bash
docker exec tutorconnect-postgres pg_isready -U postgres
```

Debería responder: `postgres:5432 - accepting connections`

## 🛠️ Troubleshooting

### Problema: Puerto 5432 ya está en uso

**Causa**: Ya tienes PostgreSQL corriendo localmente.

**Solución 1**: Detén PostgreSQL local
```bash
# Windows
Stop-Service postgresql-x64-14  # Ajusta el nombre del servicio

# Linux/Mac
sudo service postgresql stop
```

**Solución 2**: Cambia el puerto en `docker-compose.yml`
```yaml
ports:
  - "5433:5432"  # Usa puerto 5433 en tu máquina
```

### Problema: Puerto 3000 ya está en uso

**Solución**: Cambia el puerto en `docker-compose.yml`
```yaml
ports:
  - "3001:3000"  # Usa puerto 3001 en tu máquina
```

### Problema: La app no se conecta a la base de datos

**Verifica**:
1. Que PostgreSQL esté "healthy": `docker-compose ps`
2. Los logs de la app: `docker-compose logs app`
3. Variables de entorno en `docker-compose.yml`

### Problema: Cambios en el código no se reflejan

**Causa**: El código está compilado en la imagen de Docker.

**Solución**: Reconstruir la imagen
```bash
docker-compose up -d --build
```

### Problema: "No space left on device"

**Causa**: Docker ha llenado el disco.

**Solución**: Limpiar recursos no usados
```bash
# Limpiar todo lo no usado (cuidado)
docker system prune -a --volumes

# O más selectivo
docker container prune
docker image prune
docker volume prune
```

## 🔐 Seguridad en Producción

⚠️ **IMPORTANTE**: Cambia las credenciales por defecto antes de desplegar.

### Cambiar Credenciales de PostgreSQL

Edita `docker-compose.yml`:

```yaml
environment:
  POSTGRES_DB: tutorconnect
  POSTGRES_USER: tu_usuario_seguro
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}  # Usar variable de entorno
```

Y crea un archivo `.env`:

```env
POSTGRES_PASSWORD=TuContraseñaSuperSegura123!
AUTH_SECRET=UnSecretoMuyLargoyAleatorio123456789
```

### Usar Secrets de Docker (Recomendado para producción)

Ver: https://docs.docker.com/engine/swarm/secrets/

## 📊 Monitoreo

### Ver Uso de Recursos

```bash
# Uso en tiempo real
docker stats

# Solo los contenedores de TutorConnect
docker stats tutorconnect-backend tutorconnect-postgres
```

### Health Checks

Docker Compose verifica automáticamente la salud de PostgreSQL.

Para la app, puedes verificar:
```bash
curl http://localhost:3000/health
```

## 🚢 Desplegar en Producción

### Opción 1: Docker Compose (Servidores simples)

```bash
# En tu servidor
git clone <repo>
cd TutorConnect-Backend
cp .env.example .env
# Edita .env con credenciales de producción
docker-compose up -d
```

### Opción 2: Kubernetes

1. Construir y subir la imagen:
```bash
docker build -t tu-registry/tutorconnect-backend:latest .
docker push tu-registry/tutorconnect-backend:latest
```

2. Crear manifiestos de Kubernetes (deployment, service, configmap, secrets)

### Opción 3: Cloud (AWS, Azure, GCP)

- **AWS**: Usar ECS/EKS + RDS PostgreSQL
- **Azure**: Usar Container Instances + Azure Database for PostgreSQL
- **GCP**: Usar Cloud Run + Cloud SQL

## 📚 Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [Mejores Prácticas de Docker](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [NestJS con Docker](https://docs.nestjs.com/recipes/prisma#docker)

## 🆘 Obtener Ayuda

Si tienes problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica el estado: `docker-compose ps`
3. Prueba el health check: `curl http://localhost:3000/health`
4. Reinicia los servicios: `docker-compose restart`
5. Como último recurso: `docker-compose down -v && docker-compose up -d --build`

---

¿Necesitas ayuda? Abre un issue en el repositorio.

