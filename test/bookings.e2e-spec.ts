import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Bookings (e2e)', () => {
  let app: INestApplication;
  let testStudentId: string;
  let testTutorId: string;

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

    // Crear usuario estudiante
    const studentResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Student Test',
        email: 'student.booking@example.com',
        role: 'student',
      });
    
    testStudentId = studentResponse.body.id;

    // Crear usuario tutor
    const tutorUserResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Tutor Booking Test',
        email: 'tutor.booking@example.com',
        role: 'tutor',
      });

    // Crear perfil de tutor
    const tutorResponse = await request(app.getHttpServer())
      .post('/tutors')
      .send({
        userId: tutorUserResponse.body.id,
        bio: 'Tutor para bookings test',
        subjects: ['Math'],
      });
    
    testTutorId = tutorResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /bookings', () => {
    it('debe crear un booking correctamente y retornar 201', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: testTutorId,
          startTime: '2026-03-01T10:00:00.000Z',
          endTime: '2026-03-01T11:00:00.000Z',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('startTime');
          expect(res.body).toHaveProperty('endTime');
          expect(res.body).toHaveProperty('status', 'pending');
          expect(res.body).toHaveProperty('student');
          expect(res.body.student).toHaveProperty('id', testStudentId);
          expect(res.body).toHaveProperty('tutor');
          expect(res.body.tutor).toHaveProperty('id', testTutorId);
        });
    });

    it('debe fallar si el studentId no existe (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: nonExistentId,
          tutorId: testTutorId,
          startTime: '2026-03-01T10:00:00.000Z',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });

    it('debe fallar si el tutorId no existe (404)', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: nonExistentId,
          startTime: '2026-03-01T10:00:00.000Z',
        })
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });

    it('debe fallar si la fecha no es válida (400)', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: testTutorId,
          startTime: 'fecha-invalida',
        })
        .expect(400);
    });
  });

  describe('GET /bookings/:id', () => {
    it('debe obtener un booking por ID correctamente y retornar 200', async () => {
      // Crear booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: testTutorId,
          startTime: '2026-03-15T14:00:00.000Z',
          endTime: '2026-03-15T15:00:00.000Z',
        });

      const bookingId = bookingResponse.body.id;

      // Obtener el booking
      return request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', bookingId);
          expect(res.body).toHaveProperty('status', 'pending');
          expect(res.body).toHaveProperty('student');
          expect(res.body).toHaveProperty('tutor');
        });
    });

    it('debe retornar 404 si el booking no existe', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .get(`/bookings/${nonExistentId}`)
        .expect(404)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 404);
        });
    });
  });

  describe('GET /bookings', () => {
    it('debe obtener todos los bookings y retornar 200', () => {
      return request(app.getHttpServer())
        .get('/bookings')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('id');
            expect(res.body[0]).toHaveProperty('student');
            expect(res.body[0]).toHaveProperty('tutor');
            expect(res.body[0]).toHaveProperty('status');
          }
        });
    });
  });

  describe('PUT /bookings/:id', () => {
    it('debe actualizar un booking correctamente y retornar 200', async () => {
      // Crear booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: testTutorId,
          startTime: '2026-04-01T09:00:00.000Z',
          endTime: '2026-04-01T10:00:00.000Z',
        });

      const bookingId = bookingResponse.body.id;

      // Actualizar booking
      return request(app.getHttpServer())
        .put(`/bookings/${bookingId}`)
        .send({
          status: 'confirmed',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'confirmed');
        });
    });

    it('debe retornar 404 al intentar actualizar un booking inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .put(`/bookings/${nonExistentId}`)
        .send({ status: 'confirmed' })
        .expect(404);
    });
  });

  describe('DELETE /bookings/:id', () => {
    it('debe eliminar un booking correctamente y retornar 204', async () => {
      // Crear booking
      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .send({
          studentId: testStudentId,
          tutorId: testTutorId,
          startTime: '2026-05-01T16:00:00.000Z',
        });

      const bookingId = bookingResponse.body.id;

      // Eliminar booking
      await request(app.getHttpServer())
        .delete(`/bookings/${bookingId}`)
        .expect(204);

      // Verificar que ya no existe
      return request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .expect(404);
    });

    it('debe retornar 404 al intentar eliminar un booking inexistente', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .delete(`/bookings/${nonExistentId}`)
        .expect(404);
    });
  });
});
