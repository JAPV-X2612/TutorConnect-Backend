jest.mock('../../src/storage/storage.service', () => ({ StorageService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TutorsService } from '../../src/modules/tutors/tutors.service';
import { TutorEntity } from '../../src/database/entities/tutor.entity';
import { CertificacionEntity } from '../../src/database/entities/certificacion.entity';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { StorageService } from '../../src/storage/storage.service';
import { SearchService } from '../../src/modules/search/search.service';
import { EstadoTutor } from '../../src/common/enums/estado-tutor.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTutor(overrides: Partial<TutorEntity> = {}): TutorEntity {
  return {
    id: 'tutor-1', clerkId: 'clerk_1', email: 'tutor@test.com',
    nombre: 'Carlos', apellido: 'Pérez', estado: EstadoTutor.PENDIENTE,
    certificaciones: [], courses: [], disponible: false,
    ...overrides,
  } as any;
}

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return { id: 1, clerkId: 'clerk_1', email: 'tutor@test.com', firstName: 'Carlos', lastName: 'Pérez', ...overrides } as any;
}

function buildCourse(overrides: Partial<TutorCourseEntity> = {}): TutorCourseEntity {
  return { id: 'course-1', subject: 'Python', price: 60000, duration: 60, isActive: true, ...overrides } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('TutorsService', () => {
  let service: TutorsService;
  let tutorRepo: Record<string, jest.Mock>;
  let certRepo: Record<string, jest.Mock>;
  let courseRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    tutorRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn() };
    certRepo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    courseRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), create: jest.fn(), save: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const qb: any = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), leftJoinAndSelect: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    tutorRepo.createQueryBuilder.mockReturnValue(qb);
    courseRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorsService,
        { provide: getRepositoryToken(TutorEntity), useValue: tutorRepo },
        { provide: getRepositoryToken(CertificacionEntity), useValue: certRepo },
        { provide: getRepositoryToken(TutorCourseEntity), useValue: courseRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: StorageService, useValue: { uploadFile: jest.fn(), getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/file') } },
        { provide: SearchService, useValue: { indexCourse: jest.fn().mockResolvedValue(undefined), batchIndexAll: jest.fn() } },
      ],
    }).compile();

    service = module.get<TutorsService>(TutorsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns exists=false when tutor profile does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      const result = await service.getMe('unknown_clerk');
      expect(result).toEqual({ exists: false });
    });

    it('returns tutor data when profile exists', async () => {
      const tutor = buildTutor({ subjects: ['Python'] });
      tutorRepo.findOne.mockResolvedValue(tutor);
      userRepo.findOne.mockResolvedValue(buildUser());

      const result = await service.getMe('clerk_1');
      expect(result.exists).toBe(true);
      expect(result.nombre).toBe('Carlos');
      expect(result.hasCertificaciones).toBe(false);
    });
  });

  // ── register ─────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws ConflictException when tutor is already registered', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      await expect(service.register('clerk_1', { email: 'tutor@test.com', nombre: 'Carlos', apellido: 'Pérez' } as any)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates and returns the tutor when not previously registered', async () => {
      const saved = buildTutor({ estado: EstadoTutor.PENDIENTE });
      tutorRepo.findOne.mockResolvedValue(null);
      tutorRepo.create.mockReturnValue(saved);
      tutorRepo.save.mockResolvedValue(saved);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(buildUser());
      userRepo.save.mockResolvedValue(buildUser());

      const result = await service.register('clerk_1', {
        email: 'tutor@test.com', nombre: 'Carlos', apellido: 'Pérez', cedula: '123', descripcion: 'desc', especialidades: ['Python'],
      } as any);

      expect(result.nombre).toBe('Carlos');
      expect(result.estado).toBe(EstadoTutor.PENDIENTE);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns the tutor when it exists', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      expect(await service.findOne('tutor-1')).toBe(tutor);
    });

    it('throws NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all tutors when no subject filter is provided', async () => {
      const tutors = [buildTutor()];
      tutorRepo.find.mockResolvedValue(tutors);
      expect(await service.findAll()).toEqual(tutors);
    });

    it('filters by subject when a filter is provided', async () => {
      const filtered = [buildTutor({ subjects: ['Python'] })];
      const qb: any = { where: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue(filtered) };
      tutorRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findAll('Python');
      expect(result).toEqual(filtered);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.update('bad-id', { nombre: 'Nuevo' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates and returns the tutor', async () => {
      const tutor = buildTutor();
      const updated = { ...tutor, nombre: 'Nuevo' };
      tutorRepo.findOne.mockResolvedValue(tutor);
      tutorRepo.save.mockResolvedValue(updated);

      const result = await service.update('tutor-1', { nombre: 'Nuevo' });
      expect(result.nombre).toBe('Nuevo');
    });
  });

  // ── createCourse ──────────────────────────────────────────────────────────

  describe('createCourse', () => {
    it('throws NotFoundException when tutor profile does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.createCourse('ghost_clerk', { subject: 'Física' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates and returns the course', async () => {
      const tutor = buildTutor();
      const course = buildCourse({ subject: 'Física' });
      tutorRepo.findOne.mockResolvedValue(tutor);
      courseRepo.create.mockReturnValue(course);
      courseRepo.save.mockResolvedValue(course);

      const result = await service.createCourse('clerk_1', {
        subject: 'Física', description: 'desc', price: 40000, duration: 60, modalidad: 'Virtual',
      } as any);

      expect(result.subject).toBe('Física');
      expect(courseRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ── getCourses ────────────────────────────────────────────────────────────

  describe('getCourses', () => {
    it('throws NotFoundException when tutor profile does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.getCourses('ghost_clerk')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the list of courses for the tutor', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      courseRepo.find.mockResolvedValue([buildCourse()]);

      const result = await service.getCourses('clerk_1');
      expect(result).toHaveLength(1);
    });
  });

  // ── deleteCourse ──────────────────────────────────────────────────────────

  describe('deleteCourse', () => {
    it('throws NotFoundException when course does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      courseRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteCourse('bad-course', 'clerk_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the course successfully', async () => {
      const course = buildCourse();
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      courseRepo.findOne.mockResolvedValue(course);
      courseRepo.remove.mockResolvedValue(undefined);

      await expect(service.deleteCourse('course-1', 'clerk_1')).resolves.toBeUndefined();
      expect(courseRepo.remove).toHaveBeenCalledWith(course);
    });
  });
});
