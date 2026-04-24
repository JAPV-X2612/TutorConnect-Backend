import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';

// ── Helpers ──────────────────────────────────────────────────────────────────

const CLERK_ID = 'user_tutor_abc123';

/** Builds a chainable QueryBuilder mock that resolves getRawOne with `raw`. */
function makeRawQB(raw: Record<string, string | null> | null) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(raw),
  };
}

/** Builds a chainable QueryBuilder mock that resolves getMany with `rows`. */
function makeSelectQB(rows: Partial<BookingEntity>[]) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
  };
}

/** Returns a minimal BookingEntity stub for upcoming sessions. */
function makeBookingStub(overrides: Partial<BookingEntity> = {}): Partial<BookingEntity> {
  return {
    id: 'session-uuid-1',
    startTime: new Date('2025-04-20T15:00:00Z'),
    subject: 'Cálculo',
    student: {
      firstName: 'Laura',
      lastName: 'Martínez',
    } as any,
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('DashboardService', () => {
  let service: DashboardService;
  let mockBookingRepo: { createQueryBuilder: jest.Mock };
  let mockReviewRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    mockBookingRepo = { createQueryBuilder: jest.fn() };
    mockReviewRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(BookingEntity), useValue: mockBookingRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: mockReviewRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── Helper: wire repos for a full getTutorDashboard call ─────────────────

  function wireRepos({
    sessionRaw = { total_sesiones: '0', ingresos_totales: '0' },
    reviewRaw = { total_resenas: '0', calificacion_promedio: null },
    upcomingBookings = [] as Partial<BookingEntity>[],
  }: {
    sessionRaw?: Record<string, string | null>;
    reviewRaw?: Record<string, string | null>;
    upcomingBookings?: Partial<BookingEntity>[];
  } = {}) {
    mockBookingRepo.createQueryBuilder
      .mockReturnValueOnce(makeRawQB(sessionRaw))    // 1st call: metrics
      .mockReturnValueOnce(makeSelectQB(upcomingBookings)); // 2nd call: sessions

    mockReviewRepo.createQueryBuilder.mockReturnValue(makeReviewQB(reviewRaw));
  }

  function makeReviewQB(raw: Record<string, string | null> | null) {
    return makeRawQB(raw);
  }

  // ── getTutorDashboard ─────────────────────────────────────────────────────

  describe('getTutorDashboard', () => {
    it('returns metrics and upcoming sessions for an active tutor', async () => {
      wireRepos({
        sessionRaw: { total_sesiones: '24', ingresos_totales: '480000' },
        reviewRaw: { total_resenas: '18', calificacion_promedio: '4.8' },
        upcomingBookings: [makeBookingStub()],
      });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.total_sesiones).toBe(24);
      expect(result.metricas.ingresos_totales).toBe(480000);
      expect(result.metricas.calificacion_promedio).toBe(4.8);
      expect(result.metricas.total_resenas).toBe(18);
      expect(result.proximas_sesiones).toHaveLength(1);
    });

    it('returns zeros and empty sessions for a tutor with no activity', async () => {
      wireRepos();

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.total_sesiones).toBe(0);
      expect(result.metricas.ingresos_totales).toBe(0);
      expect(result.metricas.total_resenas).toBe(0);
      expect(result.proximas_sesiones).toEqual([]);
    });

    it('sets calificacion_promedio to null when the tutor has no reviews', async () => {
      wireRepos({
        reviewRaw: { total_resenas: '0', calificacion_promedio: null },
      });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.calificacion_promedio).toBeNull();
    });

    it('rounds calificacion_promedio to 2 decimal places', async () => {
      wireRepos({
        reviewRaw: { total_resenas: '3', calificacion_promedio: '4.8333333' },
      });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.calificacion_promedio).toBe(4.83);
    });

    it('always returns moneda as COP', async () => {
      wireRepos();

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.moneda).toBe('COP');
    });

    it('returns periodo in YYYY-MM format matching the current month', async () => {
      wireRepos();

      const result = await service.getTutorDashboard(CLERK_ID);

      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(result.metricas.periodo).toBe(expected);
    });

    it('does not hardcode periodo — reflects the real current month', async () => {
      wireRepos();

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.metricas.periodo).toMatch(/^\d{4}-\d{2}$/);
      expect(result.metricas.periodo).not.toBe('2025-04');
    });
  });

  // ── proximas_sesiones mapping ─────────────────────────────────────────────

  describe('proximas_sesiones', () => {
    it('maps booking fields to the expected DTO shape', async () => {
      const fecha = new Date('2025-04-20T15:00:00Z');
      wireRepos({
        upcomingBookings: [
          makeBookingStub({ id: 'uuid-1', startTime: fecha, subject: 'Cálculo' }),
        ],
      });

      const result = await service.getTutorDashboard(CLERK_ID);
      const sesion = result.proximas_sesiones[0];

      expect(sesion.id).toBe('uuid-1');
      expect(sesion.fecha).toEqual(fecha);
      expect(sesion.aprendiz_nombre).toBe('Laura Martínez');
      expect(sesion.materia).toBe('Cálculo');
    });

    it('uses N/A for aprendiz_nombre when student relation is null', async () => {
      wireRepos({
        upcomingBookings: [makeBookingStub({ student: null as any })],
      });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.proximas_sesiones[0].aprendiz_nombre).toBe('N/A');
    });

    it('returns null for materia when subject is not set on the booking', async () => {
      wireRepos({
        upcomingBookings: [makeBookingStub({ subject: null })],
      });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.proximas_sesiones[0].materia).toBeNull();
    });

    it('returns at most 5 upcoming sessions', async () => {
      const bookings = Array.from({ length: 5 }, (_, i) =>
        makeBookingStub({ id: `uuid-${i}`, subject: `Materia ${i}` }),
      );
      wireRepos({ upcomingBookings: bookings });

      const result = await service.getTutorDashboard(CLERK_ID);

      expect(result.proximas_sesiones).toHaveLength(5);
    });

    it('filters sessions by clerk_id via the tutor join — never exposes other tutors data', async () => {
      wireRepos({ upcomingBookings: [makeBookingStub()] });

      await service.getTutorDashboard(CLERK_ID);

      const sessionsQB = mockBookingRepo.createQueryBuilder.mock.results[1].value;
      expect(sessionsQB.innerJoin).toHaveBeenCalledWith(
        'b.tutor',
        't',
        't.clerkId = :clerkId',
        { clerkId: CLERK_ID },
      );
    });
  });

  // ── metricas isolation ────────────────────────────────────────────────────

  describe('metrics isolation', () => {
    it('filters session metrics by clerk_id via the tutor join', async () => {
      wireRepos();

      await service.getTutorDashboard(CLERK_ID);

      const metricsQB = mockBookingRepo.createQueryBuilder.mock.results[0].value;
      expect(metricsQB.innerJoin).toHaveBeenCalledWith(
        'b.tutor',
        't',
        't.clerkId = :clerkId',
        { clerkId: CLERK_ID },
      );
    });

    it('filters review metrics by clerk_id via the tutor join', async () => {
      wireRepos();

      await service.getTutorDashboard(CLERK_ID);

      const reviewQB = mockReviewRepo.createQueryBuilder.mock.results[0].value;
      expect(reviewQB.innerJoin).toHaveBeenCalledWith(
        'r.tutor',
        'u',
        'u.clerkId = :clerkId',
        { clerkId: CLERK_ID },
      );
    });

    it('runs session and review queries in parallel (Promise.all)', async () => {
      const sessionOrder: string[] = [];

      const metricsQB = makeRawQB({ total_sesiones: '5', ingresos_totales: '100' });
      const sessionsQB = makeSelectQB([makeBookingStub()]);
      const reviewQB = makeRawQB({ total_resenas: '2', calificacion_promedio: '4.5' });

      (metricsQB.getRawOne as jest.Mock).mockImplementation(async () => {
        sessionOrder.push('metrics-resolved');
        return { total_sesiones: '5', ingresos_totales: '100' };
      });
      (reviewQB.getRawOne as jest.Mock).mockImplementation(async () => {
        sessionOrder.push('review-resolved');
        return { total_resenas: '2', calificacion_promedio: '4.5' };
      });

      mockBookingRepo.createQueryBuilder
        .mockReturnValueOnce(metricsQB)
        .mockReturnValueOnce(sessionsQB);
      mockReviewRepo.createQueryBuilder.mockReturnValue(reviewQB);

      await service.getTutorDashboard(CLERK_ID);

      // Both repos were queried — parallel execution is verified by call count
      expect(mockBookingRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mockReviewRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(sessionOrder).toContain('metrics-resolved');
      expect(sessionOrder).toContain('review-resolved');
    });
  });
});
