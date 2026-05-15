// Mock modules with external dependencies before any imports are resolved
jest.mock('../../src/modules/bookings/bookings.gateway', () => ({ BookingsGateway: class {} }));
jest.mock('../../src/modules/firebase/firebase.service', () => ({ FirebaseService: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from '../../src/modules/bookings/bookings.service';
import { BookingEntity } from '../../src/database/entities/booking.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { TutorEntity } from '../../src/database/entities/tutor.entity';
import { TutorCourseEntity } from '../../src/modules/tutors/entities/tutor-course.entity';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity';
import { BookingsGateway } from '../../src/modules/bookings/bookings.gateway';
import { FirebaseService } from '../../src/modules/firebase/firebase.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQb(count = 0, many: Partial<BookingEntity>[] = []) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
    getMany: jest.fn().mockResolvedValue(many),
  };
  qb.clone = jest.fn().mockReturnValue(qb);
  return qb;
}

function buildLearner(overrides: Partial<UserEntity> = {}): UserEntity {
  return { id: 1, clerkId: 'learner_1', email: 'l@test.com', firstName: 'Ana', lastName: 'López', fcmToken: null, notificationsEnabled: false, ...overrides } as any;
}

function buildTutor(overrides: Partial<TutorEntity> = {}): TutorEntity {
  return { id: 'tutor-1', clerkId: 'tutor_1', nombre: 'Carlos', apellido: 'Pérez', ...overrides } as any;
}

function buildCourse(tutor: TutorEntity, overrides: Partial<TutorCourseEntity> = {}): TutorCourseEntity {
  return { id: 'course-1', subject: 'Matemáticas', price: 50000, duration: 60, tutor, isActive: true, ...overrides } as any;
}

function buildBooking(overrides: Partial<BookingEntity> = {}): BookingEntity {
  const tutor = buildTutor();
  const learner = buildLearner();
  return {
    id: 'booking-1', status: 'pending', subject: 'Matemáticas', price: 50000,
    startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z'),
    notes: null, createdAt: new Date(), student: learner, tutor, course: buildCourse(tutor),
    ...overrides,
  } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let tutorRepo: Record<string, jest.Mock>;
  let courseRepo: Record<string, jest.Mock>;
  let paymentRepo: Record<string, jest.Mock>;
  let gateway: Record<string, jest.Mock>;

  beforeEach(async () => {
    bookingRepo = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() };
    userRepo = { findOne: jest.fn() };
    tutorRepo = { findOne: jest.fn() };
    courseRepo = { findOne: jest.fn() };
    paymentRepo = { findOne: jest.fn(), save: jest.fn() };
    gateway = { notifyTutor: jest.fn(), notifyLearner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(BookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(TutorEntity), useValue: tutorRepo },
        { provide: getRepositoryToken(TutorCourseEntity), useValue: courseRepo },
        { provide: getRepositoryToken(PaymentEntity), useValue: paymentRepo },
        { provide: BookingsGateway, useValue: gateway },
        { provide: FirebaseService, useValue: { sendPush: jest.fn() } },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createBooking ─────────────────────────────────────────────────────────

  describe('createBooking', () => {
    it('throws NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.createBooking('ghost', 'c-1', '2026-06-01T10:00:00Z')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when course does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      courseRepo.findOne.mockResolvedValue(null);
      await expect(service.createBooking('learner_1', 'bad-course', '2026-06-01T10:00:00Z')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException for an invalid date string', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      courseRepo.findOne.mockResolvedValue(buildCourse(buildTutor()));
      await expect(service.createBooking('learner_1', 'c-1', 'not-a-date')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException when tutor already has a confirmed booking in the slot', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      courseRepo.findOne.mockResolvedValue(buildCourse(buildTutor()));
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(1));
      await expect(service.createBooking('learner_1', 'c-1', '2026-06-01T10:00:00Z')).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates and returns the booking when no conflicts exist', async () => {
      const tutor = buildTutor();
      const learner = buildLearner();
      const course = buildCourse(tutor);
      const saved = buildBooking({ student: learner, tutor, course });

      userRepo.findOne.mockResolvedValueOnce(learner).mockResolvedValueOnce(null);
      courseRepo.findOne.mockResolvedValue(course);
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(0));
      bookingRepo.create.mockReturnValue(saved);
      bookingRepo.save.mockResolvedValue(saved);

      const result = await service.createBooking('learner_1', 'c-1', '2026-06-01T10:00:00Z');

      expect(bookingRepo.save).toHaveBeenCalledTimes(1);
      expect((result as any).id).toBe('booking-1');
      expect(gateway.notifyTutor).toHaveBeenCalledTimes(1);
    });
  });

  // ── getLearnerBookings ────────────────────────────────────────────────────

  describe('getLearnerBookings', () => {
    it('throws NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getLearnerBookings('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns empty array when learner has no bookings', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.find.mockResolvedValue([]);
      expect(await service.getLearnerBookings('learner_1')).toEqual([]);
    });

    it('returns mapped bookings for the learner', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.find.mockResolvedValue([buildBooking({ student: learner })]);
      const result = await service.getLearnerBookings('learner_1');
      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe('booking-1');
    });
  });

  // ── getTutorBookings ──────────────────────────────────────────────────────

  describe('getTutorBookings', () => {
    it('throws NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.getTutorBookings('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns mapped bookings for the tutor', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      bookingRepo.find.mockResolvedValue([buildBooking({ tutor })]);
      const result = await service.getTutorBookings('tutor_1');
      expect(result).toHaveLength(1);
    });
  });

  // ── respondToBooking ──────────────────────────────────────────────────────

  describe('respondToBooking', () => {
    it('throws NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.respondToBooking('b-1', 'ghost', 'confirmed')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when booking does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.respondToBooking('bad', 'tutor_1', 'confirmed')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when booking belongs to a different tutor', async () => {
      const myTutor = buildTutor({ id: 'tutor-1' });
      const otherTutor = buildTutor({ id: 'tutor-99' });
      tutorRepo.findOne.mockResolvedValue(myTutor);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ tutor: otherTutor }));
      await expect(service.respondToBooking('booking-1', 'tutor_1', 'confirmed')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when booking is not pending', async () => {
      const tutor = buildTutor();
      tutorRepo.findOne.mockResolvedValue(tutor);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ tutor, status: 'confirmed' }));
      await expect(service.respondToBooking('booking-1', 'tutor_1', 'confirmed')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks booking as cancelled when tutor rejects', async () => {
      const tutor = buildTutor();
      const learner = buildLearner();
      const booking = buildBooking({ tutor, student: learner, status: 'pending' });
      tutorRepo.findOne.mockResolvedValue(tutor);
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.save.mockResolvedValue({ ...booking, status: 'cancelled' });
      paymentRepo.findOne.mockResolvedValue(null);

      const result = await service.respondToBooking('booking-1', 'tutor_1', 'cancelled');
      expect((result as any).status).toBe('cancelled');
      expect(gateway.notifyLearner).toHaveBeenCalled();
    });

    it('marks booking as confirmed when no slot conflict', async () => {
      const tutor = buildTutor();
      const learner = buildLearner();
      const booking = buildBooking({ tutor, student: learner, status: 'pending' });
      tutorRepo.findOne.mockResolvedValue(tutor);
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.save.mockResolvedValue({ ...booking, status: 'confirmed' });
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(0, []));

      const result = await service.respondToBooking('booking-1', 'tutor_1', 'confirmed');
      expect((result as any).status).toBe('confirmed');
      expect(gateway.notifyLearner).toHaveBeenCalled();
    });
  });

  // ── cancelBooking ─────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('throws NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelBooking('b-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when booking does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.cancelBooking('bad', 'learner_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when booking belongs to a different learner', async () => {
      const learner = buildLearner({ id: 1 });
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: buildLearner({ id: 99 }) }));
      await expect(service.cancelBooking('booking-1', 'learner_1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when booking is already completed', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'completed' }));
      await expect(service.cancelBooking('booking-1', 'learner_1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when booking is already cancelled', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'cancelled' }));
      await expect(service.cancelBooking('booking-1', 'learner_1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cancels a pending booking and notifies the tutor', async () => {
      const learner = buildLearner();
      const tutor = buildTutor();
      const booking = buildBooking({ student: learner, tutor, status: 'pending' });
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.save.mockResolvedValue({ ...booking, status: 'cancelled' });
      paymentRepo.findOne.mockResolvedValue(null);

      const result = await service.cancelBooking('booking-1', 'learner_1');
      expect((result as any).status).toBe('cancelled');
      expect(gateway.notifyTutor).toHaveBeenCalled();
    });
  });
});
