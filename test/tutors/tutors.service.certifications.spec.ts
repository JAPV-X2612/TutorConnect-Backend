jest.mock('../../src/storage/storage.service', () => ({ StorageService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TutorsService } from '../../src/modules/tutors/tutors.service';
import { TutorEntity } from '../../src/database/entities/tutor.entity';
import { CertificacionEntity } from '../../src/database/entities/certificacion.entity';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { StorageService } from '../../src/storage/storage.service';
import { SearchService } from '../../src/modules/search/search.service';
import { EstadoTutor } from '../../src/common/enums/estado-tutor.enum';
import { UserRole } from '../../src/common/enums/user-role.enum';

function buildTutor(overrides: Partial<TutorEntity> = {}): TutorEntity {
  return {
    id: 'tutor-1', clerkId: 'clerk_1', email: 'tutor@test.com',
    nombre: 'Carlos', apellido: 'Pérez', estado: EstadoTutor.PENDIENTE,
    certificaciones: [], courses: [], disponible: false,
    ...overrides,
  } as any;
}

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return { id: 1, clerkId: 'clerk_1', email: 'tutor@test.com', firstName: 'Carlos', lastName: 'Pérez', role: UserRole.TUTOR, ...overrides } as any;
}

function buildCourse(overrides: Partial<TutorCourseEntity> = {}): TutorCourseEntity {
  return { id: 'course-1', subject: 'Python', price: 60000, duration: 60, isActive: true, ...overrides } as any;
}

function buildCert(overrides: Partial<CertificacionEntity> = {}): CertificacionEntity {
  return { id: 'cert-1', nombreArchivo: 'cert.pdf', s3Key: 'certs/tutor-1/cert.pdf', mimeType: 'application/pdf', createdAt: new Date(), ...overrides } as any;
}

function buildFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return { originalname: 'cert.pdf', mimetype: 'application/pdf', size: 1 * 1024 * 1024, buffer: Buffer.from('data'), ...overrides } as any;
}

describe('TutorsService — certifications & advanced methods', () => {
  let service: TutorsService;
  let tutorRepo: Record<string, jest.Mock>;
  let certRepo: Record<string, jest.Mock>;
  let courseRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;

  beforeEach(async () => {
    tutorRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn() };
    certRepo = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
    courseRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]), create: jest.fn(), save: jest.fn(), remove: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    storageService = { uploadFile: jest.fn().mockResolvedValue(undefined), getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/cert.pdf') };

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
        { provide: StorageService, useValue: storageService },
        { provide: SearchService, useValue: { indexCourse: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<TutorsService>(TutorsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── uploadCertificacion ─────────────────────────────────────────────────────

  describe('uploadCertificacion', () => {
    it('should upload and return the certification with presigned URL', async () => {
      const tutor = buildTutor({ certificaciones: [] });
      const cert = buildCert();
      tutorRepo.findOne.mockResolvedValue(tutor);
      certRepo.create.mockReturnValue(cert);
      certRepo.save.mockResolvedValue(cert);

      const result = await service.uploadCertificacion('tutor-1', 'clerk_1', buildFile());

      expect(result.nombre_archivo).toBe('cert.pdf');
      expect(result.s3_url).toBe('https://s3.example.com/cert.pdf');
    });

    it('should throw NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.uploadCertificacion('bad-id', 'clerk_1', buildFile())).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when clerkId does not match tutor owner', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor({ clerkId: 'clerk_1' }));
      await expect(service.uploadCertificacion('tutor-1', 'other_clerk', buildFile())).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw BadRequestException for a disallowed MIME type', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor({ certificaciones: [] }));
      await expect(
        service.uploadCertificacion('tutor-1', 'clerk_1', buildFile({ mimetype: 'text/html' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when file exceeds 5 MB', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor({ certificaciones: [] }));
      await expect(
        service.uploadCertificacion('tutor-1', 'clerk_1', buildFile({ size: 6 * 1024 * 1024 })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when tutor already has 10 certifications', async () => {
      const certs = Array.from({ length: 10 }, () => buildCert());
      tutorRepo.findOne.mockResolvedValue(buildTutor({ certificaciones: certs as any }));
      await expect(
        service.uploadCertificacion('tutor-1', 'clerk_1', buildFile()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ── getCertificaciones ──────────────────────────────────────────────────────

  describe('getCertificaciones', () => {
    it('should return an empty array when tutor has no certifications', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      certRepo.find.mockResolvedValue([]);
      expect(await service.getCertificaciones('tutor-1')).toEqual([]);
    });

    it('should return certifications enriched with presigned URLs', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      certRepo.find.mockResolvedValue([buildCert()]);

      const result = await service.getCertificaciones('tutor-1');

      expect(result).toHaveLength(1);
      expect(result[0].url_presignada).toBe('https://s3.example.com/cert.pdf');
    });

    it('should throw NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.getCertificaciones('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── findByClerkId ───────────────────────────────────────────────────────────

  describe('findByClerkId', () => {
    it('should return the tutor when found by clerkId', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      expect(await service.findByClerkId('clerk_1')).toBe(tutor);
    });

    it('should throw NotFoundException when no tutor matches the clerkId', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.findByClerkId('unknown')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove the tutor entity from the repository', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      tutorRepo.remove.mockResolvedValue(undefined);

      await service.remove('tutor-1');

      expect(tutorRepo.remove).toHaveBeenCalledWith(tutor);
    });

    it('should throw NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── updateCourse ────────────────────────────────────────────────────────────

  describe('updateCourse', () => {
    it('should update and return the modified course', async () => {
      const tutor = buildTutor();
      const course = buildCourse();
      const updated = { ...course, price: 80000 };
      tutorRepo.findOne.mockResolvedValue(tutor);
      courseRepo.findOne.mockResolvedValue(course);
      courseRepo.save.mockResolvedValue(updated);

      const result = await service.updateCourse('course-1', 'clerk_1', { price: 80000 });

      expect(result.price).toBe(80000);
    });

    it('should throw NotFoundException when course does not belong to the tutor', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      courseRepo.findOne.mockResolvedValue(null);
      await expect(service.updateCourse('bad-course', 'clerk_1', {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── getCourseListings ────────────────────────────────────────────────────────

  describe('getCourseListings', () => {
    it('should return all active course listings when no subject filter is applied', async () => {
      const course = { ...buildCourse(), tutor: buildTutor() };
      const qb: any = { leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([course]) };
      courseRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getCourseListings();

      expect(result).toHaveLength(1);
      expect((result[0] as any).subject).toBe('Python');
    });

    it('should apply andWhere filter when subject is provided', async () => {
      const qb: any = { leftJoinAndSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
      courseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getCourseListings('Python');

      expect(qb.andWhere).toHaveBeenCalled();
    });
  });

  // ── getCourseDetail ──────────────────────────────────────────────────────────

  describe('getCourseDetail', () => {
    it('should return detailed course info including tutor and certifications', async () => {
      const tutor = buildTutor({ certificaciones: [buildCert()] as any });
      const course = { ...buildCourse(), tutor };
      courseRepo.findOne.mockResolvedValue(course);
      userRepo.findOne.mockResolvedValue(buildUser());

      const result = (await service.getCourseDetail('course-1')) as any;

      expect(result.id).toBe('course-1');
      expect(result.tutor.certificaciones).toHaveLength(1);
      expect(result.tutor.email).toBe('tutor@test.com');
    });

    it('should throw NotFoundException when course does not exist or is inactive', async () => {
      courseRepo.findOne.mockResolvedValue(null);
      await expect(service.getCourseDetail('bad-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
