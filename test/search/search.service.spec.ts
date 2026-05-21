jest.mock('../../src/modules/search/gemini-embedding.service', () => ({
  GeminiEmbeddingService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SearchService } from '../../src/modules/search/search.service';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { GeminiEmbeddingService } from '../../src/modules/search/gemini-embedding.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCourse(overrides: Partial<TutorCourseEntity> = {}): TutorCourseEntity {
  return {
    id: 'course-1', subject: 'Python', description: 'Aprende Python', objectives: 'POO, funciones',
    price: 60000, duration: 60, modalidad: 'Virtual', academicLevel: 'Universitario', isActive: true,
    tutor: { id: 'tutor-1', nombre: 'Carlos', apellido: 'Pérez', bio: 'Senior dev', subjects: ['Python'] } as any,
    ...overrides,
  } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('SearchService', () => {
  let service: SearchService;
  let courseRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let embeddingService: Record<string, jest.Mock>;

  beforeEach(async () => {
    courseRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn() };
    embeddingService = { embed: jest.fn().mockResolvedValue(new Array(1024).fill(0.1)) };

    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    courseRepo.createQueryBuilder.mockReturnValue(qb);

    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(TutorCourseEntity), useValue: courseRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: GeminiEmbeddingService, useValue: embeddingService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── indexCourse ───────────────────────────────────────────────────────────

  describe('indexCourse', () => {
    it('returns without doing anything when course does not exist', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await service.indexCourse('bad-id');

      expect(embeddingService.embed).not.toHaveBeenCalled();
      expect(courseRepo.save).not.toHaveBeenCalled();
    });

    it('generates an embedding and updates the course via raw query when course exists', async () => {
      const course = buildCourse();
      courseRepo.findOne.mockResolvedValue(course);
      dataSource.query.mockResolvedValue([]);

      await service.indexCourse('course-1');

      expect(embeddingService.embed).toHaveBeenCalledTimes(1);
      expect(dataSource.query).toHaveBeenCalledTimes(1);
    });
  });

  // ── batchIndexAll ─────────────────────────────────────────────────────────

  describe('batchIndexAll', () => {
    it('returns zero indexed when no active courses exist', async () => {
      courseRepo.find.mockResolvedValue([]);

      const result = await service.batchIndexAll();

      expect(result).toEqual({ indexed: 0, errors: 0 });
      expect(embeddingService.embed).not.toHaveBeenCalled();
    });

    it('indexes all active courses and returns the count', async () => {
      const courses = [buildCourse(), buildCourse({ id: 'course-2', subject: 'Inglés' })];
      courseRepo.find.mockResolvedValue(courses);
      dataSource.query.mockResolvedValue([]);

      const result = await service.batchIndexAll();

      expect(result).toEqual({ indexed: 2, errors: 0 });
      expect(embeddingService.embed).toHaveBeenCalledTimes(2);
    });
  });
});
