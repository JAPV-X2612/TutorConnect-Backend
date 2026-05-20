jest.mock('../../src/modules/search/gemini-embedding.service', () => ({
  GeminiEmbeddingService: class {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SearchService } from '../../src/modules/search/search.service';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { GeminiEmbeddingService } from '../../src/modules/search/gemini-embedding.service';
import { UserRole } from '../../src/common/enums/user-role.enum';

const MOCK_VECTOR = new Array(1024).fill(0.1);

function buildUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: 1, clerkId: 'learner_1',
    firstName: 'Ana', lastName: 'Gómez', role: UserRole.LEARNER,
    learningGoal: 'Improve calculus', studentType: 'universitario',
    academicProgram: 'Systems Engineering', currentSemester: 4,
    organizationName: 'ECI', interests: ['Math', 'AI'],
    ...overrides,
  } as any;
}

function buildSearchRow(overrides: Record<string, any> = {}) {
  return {
    id: 'course-1', subject: 'Calculus', description: 'Intro', price: '50000',
    duration: '60', modalidad: 'Virtual', academicLevel: 'University',
    score: '0.92', tutorId: 'tutor-1', nombre: 'Carlos', apellido: 'López',
    rating: '4.5', disponible: true, ...overrides,
  };
}

describe('SearchService — semanticSearch & getRecommendations', () => {
  let service: SearchService;
  let courseRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let embeddingService: Record<string, jest.Mock>;

  beforeEach(async () => {
    courseRepo = { findOne: jest.fn(), find: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn() };
    embeddingService = { embed: jest.fn().mockResolvedValue(MOCK_VECTOR) };
    dataSource = { query: jest.fn().mockResolvedValue([]) };

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

  // ── semanticSearch ───────────────────────────────────────────────────────────

  describe('semanticSearch', () => {
    it('should return mapped results for a valid query', async () => {
      dataSource.query.mockResolvedValue([buildSearchRow()]);

      const results = await service.semanticSearch('calculus derivatives');

      expect(embeddingService.embed).toHaveBeenCalledWith(expect.any(String), 'query');
      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe('Calculus');
      expect(results[0].score).toBe(0.92);
      expect(results[0].tutor.nombre).toBe('Carlos');
    });

    it('should return an empty array when no courses match the query', async () => {
      dataSource.query.mockResolvedValue([]);

      const results = await service.semanticSearch('quantum electrodynamics');

      expect(results).toEqual([]);
    });

    it('should pass the limit to the database query', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.semanticSearch('math', 5);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [expect.any(String), 5],
      );
    });

    it('should map tutor rating to undefined when the database returns null', async () => {
      dataSource.query.mockResolvedValue([buildSearchRow({ rating: null })]);

      const results = await service.semanticSearch('math');

      expect(results[0].tutor.rating).toBeUndefined();
    });

    it('should set description to undefined when database column is null', async () => {
      dataSource.query.mockResolvedValue([buildSearchRow({ description: null })]);

      const results = await service.semanticSearch('math');

      expect(results[0].description).toBeUndefined();
    });
  });

  // ── getRecommendations ───────────────────────────────────────────────────────

  describe('getRecommendations', () => {
    it('should throw NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getRecommendations('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should return empty array when learner profile has no data to build a query', async () => {
      userRepo.findOne.mockResolvedValue(buildUser({
        learningGoal: null, studentType: null, academicProgram: null,
        currentSemester: null, organizationName: null, interests: null,
      }));

      const results = await service.getRecommendations('learner_1');

      expect(results).toEqual([]);
      expect(embeddingService.embed).not.toHaveBeenCalled();
    });

    it('should build a query document and return recommendations for a universitario learner', async () => {
      userRepo.findOne.mockResolvedValue(buildUser());
      dataSource.query.mockResolvedValue([buildSearchRow()]);

      const results = await service.getRecommendations('learner_1');

      const [docArg, mode] = embeddingService.embed.mock.calls[0] as [string, string];
      expect(mode).toBe('query');
      expect(docArg).toContain('Improve calculus');
      expect(docArg).toContain('Systems Engineering');
      expect(results).toHaveLength(1);
    });

    it('should include colegial context when studentType is colegial', async () => {
      userRepo.findOne.mockResolvedValue(buildUser({
        studentType: 'colegial', schoolGrade: 10,
        organizationName: 'Colegio San José', learningGoal: 'Pass math',
        academicProgram: null, currentSemester: null,
      }));
      dataSource.query.mockResolvedValue([]);

      await service.getRecommendations('learner_1');

      const [docArg] = embeddingService.embed.mock.calls[0] as [string, string];
      expect(docArg).toContain('colegio');
      expect(docArg).toContain('10');
    });

    it('should include profesional context when studentType is profesional', async () => {
      userRepo.findOne.mockResolvedValue(buildUser({
        studentType: 'profesional', academicProgram: 'Data Science',
        learningGoal: 'Learn ML', currentSemester: null, organizationName: null,
      }));
      dataSource.query.mockResolvedValue([]);

      await service.getRecommendations('learner_1');

      const [docArg] = embeddingService.embed.mock.calls[0] as [string, string];
      expect(docArg).toContain('profesional');
      expect(docArg).toContain('Data Science');
    });

    it('should include interests in the query document when they exist', async () => {
      userRepo.findOne.mockResolvedValue(buildUser({ interests: ['Math', 'Physics'] }));
      dataSource.query.mockResolvedValue([]);

      await service.getRecommendations('learner_1');

      const [docArg] = embeddingService.embed.mock.calls[0] as [string, string];
      expect(docArg).toContain('Math');
      expect(docArg).toContain('Physics');
    });
  });
});
