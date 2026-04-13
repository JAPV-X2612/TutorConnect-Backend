import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Tutors (e2e)', () => {
  let app: INestApplication;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // Crear un usuario tutor para las pruebas
    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Tutor Test',
        email: 'tutor.test@example.com',
        role: 'tutor',
      });
    
    testUserId = userResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tutors', () => {
    it('debe crear un perfil de tutor correctamente y retornar 201', () => {
      return request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: testUserId,
          bio: 'Ingeniero de software con 5 años de experiencia',
          subjects: ['JavaScript', 'TypeScript', 'Node.js'],
          experienceYears: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('bio', 'Ingeniero de software con 5 años de experiencia');
          expect(res.body).toHaveProperty('subjects');
          expect(res.body.subjects).toEqual(['JavaScript', 'TypeScript', 'Node.js']);
          expect(res.body).toHaveProperty('experienceYears', 5);
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('id', testUserId);
        });
    });

    it('debe fallar si el userId no existe (404)', () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: nonExistentUserId,
          bio: 'Bio test',
          subjects: ['Math'],
          experienceYears: 3,
        })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });

    it('debe fallar si el userId no es un UUID válido (400)', () => {
      return request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: 'invalid-uuid',
          bio: 'Bio test',
        })
        .expect(400);
    });
  });

  describe('GET /tutors/:id', () => {
    it('debe obtener un tutor por ID correctamente y retornar 200', async () => {
      // Crear usuario y tutor
      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Get Tutor Test',
          email: 'gettutor.test@example.com',
          role: 'tutor',
        });

      const tutorResponse = await request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: userResponse.body.id,
          bio: 'Experto en matemáticas',
          subjects: ['Matemáticas', 'Física'],
          experienceYears: 10,
        });

      const tutorId = tutorResponse.body.id;

      // Obtener el tutor
      return request(app.getHttpServer())
        .get(`/tutors/${tutorId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', tutorId);
          expect(res.body).toHaveProperty('bio', 'Experto en matemáticas');
          expect(res.body).toHaveProperty('experienceYears', 10);
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.name).toBe('Get Tutor Test');
        });
    });

    it('debe retornar 404 si el tutor no existe', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .get(`/tutors/${nonExistentId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });
  });

  describe('GET /tutors', () => {
    it('debe obtener todos los tutores y retornar 200', () => {
      return request(app.getHttpServer())
        .get('/tutors')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('user');
          }
        });
    });
  });

  describe('PUT /tutors/:id', () => {
    it('debe actualizar un tutor correctamente y retornar 200', async () => {
      // Crear usuario y tutor
      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Update Tutor Test',
          email: 'updatetutor.test@example.com',
          role: 'tutor',
        });

      const tutorResponse = await request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: userResponse.body.id,
          bio: 'Bio original',
          experienceYears: 2,
        });

      const tutorId = tutorResponse.body.id;

      // Actualizar tutor
      return request(app.getHttpServer())
        .put(`/tutors/${tutorId}`)
        .send({
          bio: 'Bio actualizada',
          experienceYears: 3,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('bio', 'Bio actualizada');
          expect(res.body).toHaveProperty('experienceYears', 3);
        });
    });

    it('debe retornar 404 al intentar actualizar un tutor inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .put(`/tutors/${nonExistentId}`)
        .send({ bio: 'Nueva bio' })
        .expect(404);
    });
  });

  describe('DELETE /tutors/:id', () => {
    it('debe eliminar un tutor correctamente y retornar 204', async () => {
      // Crear usuario y tutor
      const userResponse = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Delete Tutor Test',
          email: 'deletetutor.test@example.com',
          role: 'tutor',
        });

      const tutorResponse = await request(app.getHttpServer())
        .post('/tutors')
        .send({
          userId: userResponse.body.id,
          bio: 'Bio test',
        });

      const tutorId = tutorResponse.body.id;

      // Eliminar tutor
      await request(app.getHttpServer())
        .delete(`/tutors/${tutorId}`)
        .expect(204);

      // Verificar que ya no existe
      return request(app.getHttpServer())
        .get(`/tutors/${tutorId}`)
        .expect(404);
    });

    it('debe retornar 404 al intentar eliminar un tutor inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .delete(`/tutors/${nonExistentId}`)
        .expect(404);
    });
  });
});
