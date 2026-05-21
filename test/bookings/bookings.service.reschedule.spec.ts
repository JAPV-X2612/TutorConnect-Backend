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

describe('BookingsService — rescheduleBooking', () => {
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

  describe('rescheduleBooking', () => {
    it('should throw NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.rescheduleBooking('booking-1', 'ghost', '2026-06-02T10:00:00Z'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw NotFoundException when booking does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.rescheduleBooking('bad-booking', 'learner_1', '2026-06-02T10:00:00Z'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ForbiddenException when booking belongs to a different learner', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner({ id: 1 }));
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: buildLearner({ id: 99 }) }));
      await expect(
        service.rescheduleBooking('booking-1', 'learner_1', '2026-06-02T10:00:00Z'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw BadRequestException for an invalid date string', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner }));
      await expect(
        service.rescheduleBooking('booking-1', 'learner_1', 'not-a-date'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw BadRequestException when booking status is not reschedulable', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'completed' }));
      await expect(
        service.rescheduleBooking('booking-1', 'learner_1', '2026-06-02T10:00:00Z'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw ConflictException when new slot conflicts with a confirmed tutor booking', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'pending' }));
      // makeQb(1) → getCount returns 1 → conflict detected
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(1));
      await expect(
        service.rescheduleBooking('booking-1', 'learner_1', '2026-06-02T10:00:00Z'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should reschedule a pending booking to the new time and notify the tutor', async () => {
      const learner = buildLearner();
      const tutor = buildTutor();
      const booking = buildBooking({ student: learner, tutor, status: 'pending' });
      const newStart = new Date('2026-06-02T10:00:00Z');
      const saved = { ...booking, startTime: newStart, endTime: new Date('2026-06-02T11:00:00Z') };

      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(0));
      bookingRepo.save.mockResolvedValue(saved);

      const result = await service.rescheduleBooking('booking-1', 'learner_1', newStart.toISOString());

      expect((result as any).startTime).toEqual(newStart);
      expect(gateway.notifyTutor).toHaveBeenCalledTimes(1);
    });

    it('should revert a confirmed booking back to pending when rescheduled', async () => {
      const learner = buildLearner();
      const tutor = buildTutor();
      const booking = buildBooking({ student: learner, tutor, status: 'confirmed' });
      const saved = { ...booking, status: 'pending', startTime: new Date('2026-06-03T09:00:00Z') };

      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(booking);
      bookingRepo.createQueryBuilder.mockReturnValue(makeQb(0));
      bookingRepo.save.mockResolvedValue(saved);

      const result = await service.rescheduleBooking('booking-1', 'learner_1', '2026-06-03T09:00:00Z');

      expect((result as any).status).toBe('pending');
      expect(gateway.notifyTutor).toHaveBeenCalledWith(
        tutor.clerkId,
        expect.objectContaining({ rescheduled: true, previousStatus: 'confirmed' }),
      );
    });
  });
});
