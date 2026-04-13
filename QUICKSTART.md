# 🚀 Inicio Rápido - TutorConnect Backend con Docker

## 📋 Requisitos Previos

### 1. Node.js (Obligatorio)
- **Versión**: Node.js 18 o superior
- **Descargar**: https://nodejs.org/
- **Verificar**: `node --version`

### 2. Docker Desktop (Obligatorio para usar Docker)
- **Descargar**: https://www.docker.com/products/docker-desktop/
- **Instalar**: Ejecuta el instalador y reinicia tu PC si es necesario
- **Verificar**: `docker --version` y `docker-compose --version`

> ⚠️ **IMPORTANTE**: Si no tienes Docker instalado, debes instalarlo primero antes de continuar con las opciones de Docker.

---

## Opción 1: Todo con Docker (Más Fácil) ⭐

### Paso 1: Instalar Dependencias

```bash
npm install
```

### Paso 2: Iniciar Todo

```bash
npm run docker:up
```

Esto iniciará:
- ✅ PostgreSQL en puerto 5432
- ✅ Backend en puerto 3000

### Paso 3: Verificar

Abre tu navegador en: http://localhost:3000/health

**Respuesta esperada:**
```json
{
  "status": "ok",
  "database": { "status": "connected" }
}
```

### ¡Listo! 🎉

---

## Opción 2: PostgreSQL en Docker + App Local

### Paso 1: Instalar Dependencias

```bash
npm install
```

### Paso 2: Iniciar PostgreSQL

```bash
npm run docker:dev
```

### Paso 3: Iniciar la App

```bash
npm run start:dev
```

### Paso 4: Verificar

Abre: http://localhost:3000/health

---

## 📋 Comandos Útiles

```bash
# Ver logs
npm run docker:logs

# Detener todo
npm run docker:down

# Reiniciar (reconstruir)
npm run docker:build

# Ver estado
docker-compose ps
```

---

## 🗄️ Conectar a PostgreSQL

**Credenciales:**
```
Host: localhost
Puerto: 5432
Base de datos: tutorconnect
Usuario: postgres
Contraseña: postgres123
```

**Desde Docker:**
```bash
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect
```

---

## ⚠️ Problemas Comunes

### Puerto 5432 ya en uso

Ya tienes PostgreSQL corriendo localmente. Opciones:

1. Detenerlo temporalmente
2. Cambiar puerto en `docker-compose.yml` a `5433:5432`

### Puerto 3000 ya en uso

Cambiar puerto en `docker-compose.yml` o en `.env`

### No aparece "database connected"

1. Espera 10 segundos (PostgreSQL está iniciando)
2. Revisa logs: `npm run docker:logs`
3. Reinicia: `npm run docker:down && npm run docker:up`

---

## 📚 Documentación Completa

- **General**: Ver [README.md](./README.md)
- **Docker**: Ver [DOCKER.md](./DOCKER.md)

---

¿Problemas? Abre un issue en el repositorio.

