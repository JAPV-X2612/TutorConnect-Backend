import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configurar pipes y filtros como en main.ts
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users', () => {
    it('debe crear un usuario correctamente y retornar 201', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'María López',
          email: 'maria.test@example.com',
          role: 'student',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'María López');
          expect(res.body).toHaveProperty('email', 'maria.test@example.com');
          expect(res.body).toHaveProperty('role', 'student');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          createdUserId = res.body.id;
        });
    });

    it('debe fallar con validación si el email es inválido (400)', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Juan Pérez',
          email: 'email-invalido',
          role: 'student',
        })
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });

    it('debe fallar si el rol es inválido (400)', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Pedro García',
          email: 'pedro@example.com',
          role: 'admin', // rol no permitido
        })
        .expect(400);
    });
  });

  describe('GET /users/:id', () => {
    it('debe obtener un usuario por ID correctamente y retornar 200', async () => {
      // Primero crear un usuario
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Carlos Test',
          email: 'carlos.test@example.com',
          role: 'tutor',
        });

      const userId = createResponse.body.id;

      // Luego obtenerlo
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', userId);
          expect(res.body).toHaveProperty('name', 'Carlos Test');
          expect(res.body).toHaveProperty('email', 'carlos.test@example.com');
          expect(res.body).toHaveProperty('role', 'tutor');
        });
    });

    it('debe retornar 404 si el usuario no existe', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });
  });

  describe('GET /users', () => {
    it('debe obtener todos los usuarios y retornar 200', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('name');
            expect(res.body[0]).toHaveProperty('email');
          }
        });
    });
  });

  describe('PUT /users/:id', () => {
    it('debe retornar 404 al intentar actualizar un usuario inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .put(`/users/${nonExistentId}`)
        .send({ name: 'Nuevo Nombre' })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });
  });

  describe('DELETE /users/:id', () => {
    it('debe eliminar un usuario correctamente y retornar 204', async () => {
      // Crear usuario
      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Usuario a Eliminar',
          email: 'eliminar.test@example.com',
          role: 'student',
        });

      const userId = createResponse.body.id;

      // Eliminar usuario
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .expect(204);

      // Verificar que ya no existe
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .expect(404);
    });

    it('debe retornar 404 al intentar eliminar un usuario inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .delete(`/users/${nonExistentId}`)
        .expect(404);
    });
  });
});
