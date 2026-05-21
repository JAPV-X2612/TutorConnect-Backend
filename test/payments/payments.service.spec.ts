jest.mock('../../src/modules/bookings/bookings.gateway', () => ({ BookingsGateway: class {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity';
import { BookingEntity } from '../../src/database/entities/booking.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { TutorEntity } from '../../src/database/entities/tutor.entity';
import { BookingsGateway } from '../../src/modules/bookings/bookings.gateway';
import { PaymentStatus } from '../../src/common/enums/payment-status.enum';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLearner(overrides: Partial<UserEntity> = {}): UserEntity {
  return { id: 1, clerkId: 'learner_1', firstName: 'Ana', lastName: 'López', ...overrides } as any;
}

function buildTutor(overrides: Partial<TutorEntity> = {}): TutorEntity {
  return { id: 'tutor-1', clerkId: 'tutor_1', nombre: 'Carlos', apellido: 'Pérez', ...overrides } as any;
}

function buildBooking(overrides: Partial<BookingEntity> = {}): BookingEntity {
  return {
    id: 'booking-1', status: 'pending', price: 50000, subject: 'Matemáticas',
    startTime: new Date('2026-06-01T10:00:00Z'), endTime: new Date('2026-06-01T11:00:00Z'),
    student: buildLearner(), tutor: buildTutor(),
    course: { subject: 'Matemáticas', duration: 60, modalidad: 'Virtual' },
    ...overrides,
  } as any;
}

function buildPayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return {
    id: 1, amount: 50000, commissionRate: 0.15, commissionAmount: 7500,
    status: PaymentStatus.COMPLETED, createdAt: new Date(),
    booking: buildBooking({ status: 'confirmed' }),
    learner: buildLearner(),
    ...overrides,
  } as any;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: Record<string, jest.Mock>;
  let bookingRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let tutorRepo: Record<string, jest.Mock>;
  let gateway: Record<string, jest.Mock>;

  beforeEach(async () => {
    paymentRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn() };
    bookingRepo = { findOne: jest.fn(), save: jest.fn() };
    userRepo = { findOne: jest.fn() };
    tutorRepo = { findOne: jest.fn() };
    gateway = { notifyTutor: jest.fn(), notifyLearner: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentEntity), useValue: paymentRepo },
        { provide: getRepositoryToken(BookingEntity), useValue: bookingRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(TutorEntity), useValue: tutorRepo },
        { provide: BookingsGateway, useValue: gateway },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // ── getBookingSummary ─────────────────────────────────────────────────────

  describe('getBookingSummary', () => {
    it('throws NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getBookingSummary('b-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when booking does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.getBookingSummary('bad', 'learner_1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when booking belongs to a different learner', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner({ id: 1 }));
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: buildLearner({ id: 99 }) }));
      await expect(service.getBookingSummary('booking-1', 'learner_1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when booking is not pending', async () => {
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'confirmed' }));
      await expect(service.getBookingSummary('booking-1', 'learner_1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns payment summary for a pending booking', async () => {
      jest.useFakeTimers();
      const learner = buildLearner();
      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: learner, status: 'pending' }));

      const result = await service.getBookingSummary('booking-1', 'learner_1');

      expect(result.bookingId).toBe('booking-1');
      expect(result.paymentBreakdown.grossAmount).toBe(50000);
      expect(result.paymentBreakdown.commissionRate).toBe(0.15);
      expect(result.paymentBreakdown.currency).toBe('COP');
    });
  });

  // ── processPayment ────────────────────────────────────────────────────────

  describe('processPayment', () => {
    it('throws NotFoundException when learner does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.processPayment('b-1', 'ghost', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when booking does not exist', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner());
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.processPayment('bad', 'learner_1', {} as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when booking belongs to another learner', async () => {
      userRepo.findOne.mockResolvedValue(buildLearner({ id: 1 }));
      bookingRepo.findOne.mockResolvedValue(buildBooking({ student: buildLearner({ id: 99 }) }));
      await expect(service.processPayment('booking-1', 'learner_1', {} as any)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('processes and returns a successful payment', async () => {
      jest.useFakeTimers();
      const learner = buildLearner();
      const booking = buildBooking({ student: learner });
      const payment = buildPayment({ id: 42, booking, learner });

      userRepo.findOne.mockResolvedValue(learner);
      bookingRepo.findOne.mockResolvedValue(booking);
      paymentRepo.create.mockReturnValue(payment);
      paymentRepo.save.mockResolvedValue(payment);

      const result = await service.processPayment('booking-1', 'learner_1', { cardNumber: '4111111111111111' } as any);

      expect(result.approved).toBe(true);
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.amount).toBe(50000);
      expect(paymentRepo.save).toHaveBeenCalledTimes(1);
      expect(gateway.notifyTutor).toHaveBeenCalled();
      expect(gateway.notifyLearner).toHaveBeenCalled();
    });
  });

  // ── getTutorPaymentHistory ────────────────────────────────────────────────

  describe('getTutorPaymentHistory', () => {
    it('throws NotFoundException when tutor does not exist', async () => {
      tutorRepo.findOne.mockResolvedValue(null);
      await expect(service.getTutorPaymentHistory('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns empty history when tutor has no completed payments', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());

      const qb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTutorPaymentHistory('tutor_1');

      expect(result.history).toEqual([]);
      expect(result.filterSummary.totalSessions).toBe(0);
    });

    it('returns history and computes totals correctly', async () => {
      tutorRepo.findOne.mockResolvedValue(buildTutor());

      const now = new Date();
      const payments = [
        buildPayment({
          id: 1, amount: 50000, commissionAmount: 7500,
          booking: buildBooking({ startTime: now, subject: 'Matemáticas', status: 'confirmed' }),
          learner: buildLearner(),
        }),
      ];

      const qb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(payments),
      };
      paymentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTutorPaymentHistory('tutor_1');

      expect(result.history).toHaveLength(1);
      expect(result.filterSummary.totalSessions).toBe(1);
      expect(result.filterSummary.grossRevenue).toBe(50000);
    });
  });
});
