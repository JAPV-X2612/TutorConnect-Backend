# 🧪 Pruebas E2E - TutorConnect Backend

## 📋 Casos de Prueba Implementados

Se han implementado pruebas end-to-end (e2e) para los tres módulos principales del sistema:

### 1️⃣ **Usuarios (Users)**
- ✅ **Crear usuario**: Verifica que se cree correctamente y retorne 201
- ✅ **Obtener usuario por ID**: Valida que la respuesta es correcta y retorna 200
- ✅ **Intentar obtener usuario inexistente**: Verifica manejo de error 404
- ✅ **Actualizar usuario**: Verifica actualización correcta y retorna 200
- ✅ **Actualizar usuario inexistente**: Verifica error 404
- ✅ **Eliminar usuario**: Verifica eliminación correcta y retorna 204
- ✅ **Validación de datos**: Verifica que email inválido retorne 400
- ✅ **Listar todos los usuarios**: Verifica que retorne 200

### 2️⃣ **Tutores (Tutors)**
- ✅ **Crear perfil de tutor**: Verifica creación correcta y retorna 201
- ✅ **Crear tutor con usuario inexistente**: Verifica error 404
- ✅ **Crear tutor con UUID inválido**: Verifica error 400
- ✅ **Obtener tutor por ID**: Valida respuesta correcta y retorna 200
- ✅ **Obtener tutor inexistente**: Verifica error 404
- ✅ **Actualizar tutor**: Verifica actualización correcta y retorna 200
- ✅ **Actualizar tutor inexistente**: Verifica error 404
- ✅ **Eliminar tutor**: Verifica eliminación correcta y retorna 204
- ✅ **Listar todos los tutores**: Verifica que retorne 200

### 3️⃣ **Reservas (Bookings)**
- ✅ **Crear reserva**: Verifica creación correcta y retorna 201
- ✅ **Crear reserva con estudiante inexistente**: Verifica error 404
- ✅ **Crear reserva con tutor inexistente**: Verifica error 404
- ✅ **Crear reserva con fecha inválida**: Verifica error 400
- ✅ **Obtener reserva por ID**: Valida respuesta correcta y retorna 200
- ✅ **Obtener reserva inexistente**: Verifica error 404
- ✅ **Actualizar reserva**: Verifica actualización correcta y retorna 200
- ✅ **Actualizar reserva inexistente**: Verifica error 404
- ✅ **Eliminar reserva**: Verifica eliminación correcta y retorna 204
- ✅ **Listar todas las reservas**: Verifica que retorne 200

---

## 🚀 Cómo Ejecutar las Pruebas

### Opción 1: Con Docker (Recomendado)

1. **Asegúrate de que Docker esté corriendo**:
```bash
docker --version
```

2. **Inicia la base de datos**:
```bash
npm run docker:dev
```

3. **Crea un archivo `.env.test` en la raíz del proyecto**:
```env
# Database Test Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tutorconnect
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123

# App Configuration
PORT=3001
NODE_ENV=test
```

4. **Ejecuta las pruebas**:
```bash
npm run test:e2e
```

### Opción 2: Con Base de Datos Local

Si tienes PostgreSQL instalado localmente:

1. **Crea una base de datos de pruebas**:
```sql
CREATE DATABASE tutorconnect_test;
```

2. **Configura el archivo `.env.test`**:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tutorconnect_test
DATABASE_USER=tu_usuario
DATABASE_PASSWORD=tu_contraseña
```

3. **Ejecuta las pruebas**:
```bash
npm run test:e2e
```

---

## 📊 Cobertura de Pruebas

Las pruebas cubren:
- ✅ **Códigos HTTP correctos** (200, 201, 204, 400, 404)
- ✅ **Validación de datos de entrada**
- ✅ **Manejo de errores** (recursos no encontrados, datos inválidos)
- ✅ **CRUD completo** (Create, Read, Update, Delete)
- ✅ **Relaciones entre entidades** (User-Tutor, Student-Tutor-Booking)
- ✅ **Validaciones de negocio** (usuario debe existir antes de crear tutor)

---

## 🎯 Casos de Uso Críticos

### Caso 1: Crear y Verificar Usuario
```typescript
POST /users
Body: { name: "María", email: "maria@example.com", role: "student" }
Resultado esperado: 201 Created + datos del usuario con ID generado
```

### Caso 2: Obtener Usuario por ID
```typescript
GET /users/{id}
Resultado esperado: 200 OK + datos completos del usuario
```

### Caso 3: Actualizar Recurso Inexistente
```typescript
PUT /users/00000000-0000-0000-0000-000000000000
Resultado esperado: 404 Not Found + mensaje de error estructurado
```

---

## 📁 Ubicación de las Pruebas

```
test/
├── users.e2e-spec.ts     # Pruebas del módulo de usuarios
├── tutors.e2e-spec.ts    # Pruebas del módulo de tutores
├── bookings.e2e-spec.ts  # Pruebas del módulo de reservas
└── jest-e2e.json         # Configuración de Jest para e2e
```

---

## 🐛 Troubleshooting

### Error: "password authentication failed"
- Verifica que las credenciales en `.env.test` coincidan con tu base de datos
- Asegúrate de que PostgreSQL esté corriendo

### Error: "relation does not exist"
- La base de datos no tiene las tablas creadas
- Ejecuta la aplicación una vez para que TypeORM cree las tablas automáticamente
- O ejecuta: `npm run docker:up` y luego `npm run test:e2e`

### Error: "timeout"
- La aplicación tarda en conectarse a la base de datos
- Aumenta el timeout en el archivo de pruebas o espera a que la BD esté lista

---

## 📚 Tecnologías Utilizadas

- **Jest**: Framework de testing
- **Supertest**: Testing HTTP
- **NestJS Testing**: Utilidades de testing de Nest
- **TypeORM**: ORM para gestión de base de datos

---

¿Preguntas? Abre un issue en el repositorio.
