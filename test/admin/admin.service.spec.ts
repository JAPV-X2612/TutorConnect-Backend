import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from '../../src/modules/admin/admin.service';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { TutorEntity } from '../../src/database/entities/tutor.entity';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { SearchService } from '../../src/modules/search/search.service';
import { UserRole } from '../../src/common/enums/user-role.enum';
import { EstadoTutor } from '../../src/common/enums/estado-tutor.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return { id: 1, clerkId: 'clerk_1', role: UserRole.TUTOR, ...overrides } as any;
}

function buildTutor(overrides: Partial<TutorEntity> = {}): TutorEntity {
  return { id: 'tutor-1', clerkId: 'clerk_1', nombre: 'Elena', estado: EstadoTutor.VERIFICADO, ...overrides } as any;
}

function buildCourse(overrides: Partial<TutorCourseEntity> = {}): TutorCourseEntity {
  return { id: 'course-1', subject: 'Cálculo', tutor: buildTutor(), isActive: true, ...overrides } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let userRepo: Record<string, jest.Mock>;
  let tutorRepo: Record<string, jest.Mock>;
  let courseRepo: Record<string, jest.Mock>;
  let searchService: Record<string, jest.Mock>;

  beforeEach(async () => {
    userRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    tutorRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    courseRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    searchService = { batchIndexAll: jest.fn().mockResolvedValue({ indexed: 8 }), indexCourse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(TutorEntity), useValue: tutorRepo },
        { provide: getRepositoryToken(TutorCourseEntity), useValue: courseRepo },
        { provide: SearchService, useValue: searchService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── runDemoSeed ───────────────────────────────────────────────────────────

  describe('runDemoSeed', () => {
    it('skips creation when all tutors and learners already exist', async () => {
      userRepo.findOne.mockResolvedValue(buildUser());
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      courseRepo.findOne.mockResolvedValue(buildCourse());

      const result = await service.runDemoSeed();

      expect(result.tutors).toBe(0);
      expect(result.courses).toBe(0);
      // Learner count: 2 learners exist, so 0 created
      expect(result.learners).toBe(0);
      // user.save is called to update existing learner interests, not to create
      expect(tutorRepo.save).not.toHaveBeenCalled();
    });

    it('creates tutors and courses when they do not exist', async () => {
      // userRepo: tutor user does not exist → create
      // tutorRepo: tutor does not exist → create
      // courseRepo: course does not exist → create
      // For learners: user does not exist → create
      userRepo.findOne.mockResolvedValue(null);
      tutorRepo.findOne.mockResolvedValue(null);
      courseRepo.findOne.mockResolvedValue(null);

      userRepo.create.mockReturnValue(buildUser());
      userRepo.save.mockResolvedValue(buildUser());
      tutorRepo.create.mockReturnValue(buildTutor());
      tutorRepo.save.mockResolvedValue(buildTutor());
      courseRepo.create.mockReturnValue(buildCourse());
      courseRepo.save.mockResolvedValue(buildCourse());

      const result = await service.runDemoSeed();

      expect(result.tutors).toBeGreaterThan(0);
      expect(result.courses).toBeGreaterThan(0);
      expect(result.learners).toBeGreaterThan(0);
      expect(tutorRepo.save).toHaveBeenCalled();
      expect(courseRepo.save).toHaveBeenCalled();
    });
  });

  // ── runIndex ──────────────────────────────────────────────────────────────

  describe('runIndex', () => {
    it('delegates to SearchService.batchIndexAll and returns the count', async () => {
      const result = await service.runIndex();

      expect(searchService.batchIndexAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ indexed: 8 });
    });
  });
});
