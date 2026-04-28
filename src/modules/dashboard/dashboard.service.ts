import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from '../users/entities/user.entity';
import {
  LearnerDashboardDto,
  UpcomingSessionDto,
  WeeklyProgressDto,
} from './dtos/learner-dashboard.dto';
import {
  MetricasTutorDto,
  ProximaSesionDto,
  TutorDashboardResponseDto,
} from './dto/tutor-dashboard.dto';

const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'completed'];

/**
 * Business logic service for the dashboard module.
 *
 * Aggregates two role-specific payloads:
 * - Learner: weekly progress (completed vs. total bookings) and upcoming
 *   sessions (HU-06).
 * - Tutor: monthly metrics (sessions, reviews, average rating) and upcoming
 *   confirmed sessions (HU-07).
 *
 * Both flows resolve the user from the verified Clerk JWT — the clerkId is
 * never accepted from request payloads.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  // ── Learner dashboard (HU-06) ─────────────────────────────────────────────

  /**
   * Builds the full learner dashboard payload.
   *
   * @param clerkId - Clerk user ID extracted from the verified JWT.
   * @returns Aggregated dashboard data.
   * @throws {NotFoundException} When no user record exists for the given clerkId.
   */
  async getLearnerDashboard(clerkId: string): Promise<LearnerDashboardDto> {
    const user = await this.userRepo.findOne({ where: { clerkId } });
    if (!user) {
      throw new NotFoundException(`User with clerkId ${clerkId} not found`);
    }

    const [weeklyProgress, upcomingSessions] = await Promise.all([
      this.buildWeeklyProgress(user.id),
      this.buildUpcomingSessions(user.id),
    ]);

    return { weeklyProgress, upcomingSessions };
  }

  /**
   * Counts completed vs. total active bookings in the current ISO week.
   *
   * @param userId - Internal user primary key.
   */
  private async buildWeeklyProgress(userId: number): Promise<WeeklyProgressDto> {
    const { weekStart, weekEnd } = this.currentWeekRange();

    const base = () =>
      this.bookingRepo
        .createQueryBuilder('b')
        .innerJoin('b.student', 'l')
        .where('l.id = :userId', { userId })
        .andWhere('b.startTime >= :weekStart', { weekStart })
        .andWhere('b.startTime <= :weekEnd', { weekEnd });

    const [completed, total] = await Promise.all([
      base()
        .andWhere('b.status = :completed', { completed: 'completed' })
        .getCount(),
      base()
        .andWhere('b.status IN (:...statuses)', { statuses: ACTIVE_BOOKING_STATUSES })
        .getCount(),
    ]);

    return { completed, total };
  }

  /**
   * Fetches the next 5 active upcoming bookings for the learner ordered
   * chronologically. The `subject` is derived from the tutor's first registered
   * specialty (UserEntity.specialties).
   *
   * @param userId - Internal user primary key.
   */
  private async buildUpcomingSessions(
    userId: number,
  ): Promise<UpcomingSessionDto[]> {
    const bookings = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.student', 'l')
      .innerJoinAndSelect('b.tutor', 't')
      .where('l.id = :userId', { userId })
      .andWhere('b.startTime > :now', { now: new Date() })
      .andWhere('b.status IN (:...statuses)', { statuses: ACTIVE_BOOKING_STATUSES })
      .orderBy('b.startTime', 'ASC')
      .take(5)
      .getMany();

    return bookings.map((b) => ({
      id: String(b.id),
      subject: (b.tutor.subjects ?? [])[0] ?? b.subject ?? 'Sesión',
      tutorName: `${b.tutor.nombre} ${b.tutor.apellido}`.trim(),
      scheduledAt: b.startTime,
      status: b.status,
    }));
  }

  /**
   * Computes the Monday 00:00 – Sunday 23:59:59 range for the current week.
   */
  private currentWeekRange(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  }

  // ── Tutor dashboard (HU-07) ───────────────────────────────────────────────

  async getTutorDashboard(clerkId: string): Promise<TutorDashboardResponseDto> {
    const [metricas, proximas_sesiones] = await Promise.all([
      this.getMetricasTutor(clerkId),
      this.getProximasSesionesTutor(clerkId),
    ]);

    return { metricas, proximas_sesiones };
  }

  /** Métricas del mes actual para el tutor. */
  private async getMetricasTutor(clerkId: string): Promise<MetricasTutorDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [sessionRaw, reviewRaw] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COUNT(b.id)', 'total_sesiones')
        .innerJoin('b.tutor', 't', 't.clerkId = :clerkId', { clerkId })
        .where('b.status = :status', { status: 'completed' })
        .andWhere('b.startTime >= :monthStart', { monthStart })
        .andWhere('b.startTime < :monthEnd', { monthEnd })
        .getRawOne<{ total_sesiones: string }>(),

      this.reviewRepo
        .createQueryBuilder('r')
        .select('COUNT(r.id)', 'total_resenas')
        .addSelect('AVG(r.rating)', 'calificacion_promedio')
        .innerJoin('r.tutor', 'u', 'u.clerkId = :clerkId', { clerkId })
        .getRawOne<{ total_resenas: string; calificacion_promedio: string | null }>(),
    ]);

    const promedioRaw = reviewRaw?.calificacion_promedio;

    return {
      total_sesiones: Number(sessionRaw?.total_sesiones ?? 0),
      ingresos_totales: 0,
      moneda: 'COP',
      periodo,
      calificacion_promedio:
        promedioRaw != null ? Math.round(Number(promedioRaw) * 100) / 100 : null,
      total_resenas: Number(reviewRaw?.total_resenas ?? 0),
    };
  }

  /** Próximas 5 sesiones agendadas (CONFIRMED) del tutor. */
  private async getProximasSesionesTutor(
    clerkId: string,
  ): Promise<ProximaSesionDto[]> {
    const bookings = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.student', 'learner')
      .innerJoin('b.tutor', 't', 't.clerkId = :clerkId', { clerkId })
      .where('b.status = :status', { status: 'confirmed' })
      .andWhere('b.startTime > :now', { now: new Date() })
      .orderBy('b.startTime', 'ASC')
      .take(5)
      .getMany();

    return bookings.map((b) => ({
      id: String(b.id),
      fecha: b.startTime,
      aprendiz_nombre: b.student
        ? `${b.student.firstName} ${b.student.lastName}`.trim()
        : 'N/A',
      materia: b.subject ?? null,
    }));
  }
}
