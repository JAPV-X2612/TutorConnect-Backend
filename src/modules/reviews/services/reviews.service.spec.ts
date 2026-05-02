import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewEntity } from '../entities/review.entity';
import { BookingEntity } from '../../../database/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateReviewDto } from '../dtos/requests/create-review.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────

const LEARNER_CLERK_ID = 'user_learner_abc';
const TUTOR_CLERK_ID = 'user_tutor_xyz';
const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

type MockRepo = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function makeMockRepo(): MockRepo {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

function buildLearner(): Partial<UserEntity> {
  return { id: 1, clerkId: LEARNER_CLERK_ID } as Partial<UserEntity>;
}

function buildTutorUser(): Partial<UserEntity> {
  return { id: 2, clerkId: TUTOR_CLERK_ID } as Partial<UserEntity>;
}

function buildBooking(
  overrides: Partial<BookingEntity> = {},
): Partial<BookingEntity> {
  return {
    id: BOOKING_ID,
    status: 'completed',
    student: { id: 1, clerkId: LEARNER_CLERK_ID } as any,
    tutor: { id: 'tutor-uuid', clerkId: TUTOR_CLERK_ID } as any,
    ...overrides,
  };
}

/**
 * Wires userRepository.findOne to return the learner when looked up by the
 * learner clerk id, and the tutor user when looked up by the tutor clerk id.
 */
function wireUserLookups(
  userRepo: MockRepo,
  options: { learner?: Partial<UserEntity> | null; tutor?: Partial<UserEntity> | null } = {},
): void {
  const learner = options.learner === undefined ? buildLearner() : options.learner;
  const tutor = options.tutor === undefined ? buildTutorUser() : options.tutor;
  userRepo.findOne.mockImplementation(({ where }) => {
    if (where?.clerkId === LEARNER_CLERK_ID) return Promise.resolve(learner);
    if (where?.clerkId === TUTOR_CLERK_ID) return Promise.resolve(tutor);
    return Promise.resolve(null);
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: MockRepo;
  let bookingRepo: MockRepo;
  let userRepo: MockRepo;

  beforeEach(async () => {
    reviewRepo = makeMockRepo();
    bookingRepo = makeMockRepo();
    userRepo = makeMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createReview ──────────────────────────────────────────────────────────

  describe('createReview', () => {
    function defaultDto(overrides: Partial<CreateReviewDto> = {}): CreateReviewDto {
      return {
        bookingId: BOOKING_ID,
        rating: 5,
        comment: 'Excelente sesión',
        ...overrides,
      };
    }

    it('persists a review for a completed booking owned by the learner', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(buildBooking());
      reviewRepo.findOne.mockResolvedValue(null);
      reviewRepo.create.mockImplementation((data) => data);
      reviewRepo.save.mockImplementation(async (data) => ({
        ...data,
        id: 42,
        createdAt: new Date('2026-05-02T12:00:00Z'),
      }));

      const result = await service.createReview(LEARNER_CLERK_ID, defaultDto());

      expect(reviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, comment: 'Excelente sesión' }),
      );
      expect(reviewRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        id: 42,
        bookingId: BOOKING_ID,
        rating: 5,
        comment: 'Excelente sesión',
        createdAt: new Date('2026-05-02T12:00:00Z'),
      });
    });

    it('persists a review without a comment when none is provided', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(buildBooking());
      reviewRepo.findOne.mockResolvedValue(null);
      reviewRepo.create.mockImplementation((data) => data);
      reviewRepo.save.mockImplementation(async (data) => ({
        ...data,
        id: 7,
        createdAt: new Date(),
      }));

      const result = await service.createReview(LEARNER_CLERK_ID, defaultDto({ comment: undefined }));

      expect(reviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: null }),
      );
      expect(result.comment).toBeNull();
    });

    it.each(['pending', 'confirmed', 'cancelled'] as const)(
      'rejects when booking status is %s (only completed sessions can be reviewed)',
      async (status) => {
        wireUserLookups(userRepo);
        bookingRepo.findOne.mockResolvedValue(buildBooking({ status }));

        await expect(
          service.createReview(LEARNER_CLERK_ID, defaultDto()),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(reviewRepo.save).not.toHaveBeenCalled();
      },
    );

    it('rejects when a review already exists for this (booking, learner)', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(buildBooking());
      reviewRepo.findOne.mockResolvedValue({ id: 99 } as Partial<ReviewEntity>);

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(reviewRepo.save).not.toHaveBeenCalled();
    });

    it('rejects with Forbidden when the booking belongs to a different learner', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(
        buildBooking({
          student: { id: 999, clerkId: 'other_learner' } as any,
        }),
      );

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(reviewRepo.save).not.toHaveBeenCalled();
    });

    it('rejects with Forbidden when the booking has no student relation', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(
        buildBooking({ student: null as any }),
      );

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFound when the learner profile cannot be resolved', async () => {
      wireUserLookups(userRepo, { learner: null });

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(bookingRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFound when the booking does not exist', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the tutor user record cannot be resolved', async () => {
      wireUserLookups(userRepo, { tutor: null });
      bookingRepo.findOne.mockResolvedValue(buildBooking());

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(reviewRepo.save).not.toHaveBeenCalled();
    });

    it('does not perform the duplicate check until ownership and status pass', async () => {
      wireUserLookups(userRepo);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ status: 'pending' }));

      await expect(
        service.createReview(LEARNER_CLERK_ID, defaultDto()),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(reviewRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── getReviewForBooking ───────────────────────────────────────────────────

  describe('getReviewForBooking', () => {
    it('returns null when no review exists for the booking', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(buildBooking());
      reviewRepo.findOne.mockResolvedValue(null);

      const result = await service.getReviewForBooking(LEARNER_CLERK_ID, BOOKING_ID);

      expect(result).toBeNull();
    });

    it('returns the existing review when present', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(buildBooking());
      reviewRepo.findOne.mockResolvedValue({
        id: 5,
        rating: 4,
        comment: null,
        createdAt: new Date('2026-05-02T15:30:00Z'),
      } as Partial<ReviewEntity>);

      const result = await service.getReviewForBooking(LEARNER_CLERK_ID, BOOKING_ID);

      expect(result).toEqual({
        id: 5,
        bookingId: BOOKING_ID,
        rating: 4,
        comment: null,
        createdAt: new Date('2026-05-02T15:30:00Z'),
      });
    });

    it('throws Forbidden when the booking belongs to another learner', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(
        buildBooking({
          student: { id: 999, clerkId: 'other' } as any,
        }),
      );

      await expect(
        service.getReviewForBooking(LEARNER_CLERK_ID, BOOKING_ID),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(reviewRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFound when the booking does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getReviewForBooking(LEARNER_CLERK_ID, BOOKING_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the learner profile cannot be resolved', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getReviewForBooking(LEARNER_CLERK_ID, BOOKING_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(bookingRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
