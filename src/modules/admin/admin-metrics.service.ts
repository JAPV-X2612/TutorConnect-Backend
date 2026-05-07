import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { AdminMetricsQueryDto } from './dtos/admin-metrics-query.dto';
import { AdminMetricsResponseDto } from './dtos/admin-metrics-response.dto';

/**
 * Aggregates platform-wide KPI metrics for the admin dashboard.
 *
 * All queries use raw SQL via QueryBuilder to avoid loading full entity graphs.
 * BookingEntity.status uses string literals ('completed', 'pending', etc.) due
 * to known technical debt — the BookingStatus enum is not yet applied to the entity.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-06
 */
@Injectable()
export class AdminMetricsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepo: Repository<TutorEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
  ) {}

  async getMetrics(query: AdminMetricsQueryDto): Promise<AdminMetricsResponseDto> {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [users, sessions, revenue, nps, topTutors] = await Promise.all([
      this.getUserMetrics(from, to),
      this.getSessionMetrics(from, to),
      this.getRevenueMetrics(from, to),
      this.getNpsMetrics(from, to),
      this.getTopTutors(from, to),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      period: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      users,
      sessions,
      revenue,
      nps,
      topTutors,
    };
  }

  private async getUserMetrics(from: Date, to: Date) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totals, newThisWeekRaw, newThisMonthRaw, growthRaw] = await Promise.all([
      this.userRepo
        .createQueryBuilder('u')
        .select('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('u.deletedAt IS NULL')
        .groupBy('u.role')
        .getRawMany<{ role: string; count: string }>(),

      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(*)', 'count')
        .where('u.deletedAt IS NULL')
        .andWhere('u.createdAt >= :start', { start: startOfWeek })
        .getRawOne<{ count: string }>(),

      this.userRepo
        .createQueryBuilder('u')
        .select('COUNT(*)', 'count')
        .where('u.deletedAt IS NULL')
        .andWhere('u.createdAt >= :start', { start: startOfMonth })
        .getRawOne<{ count: string }>(),

      this.userRepo
        .createQueryBuilder('u')
        .select("TO_CHAR(u.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('u.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .where('u.deletedAt IS NULL')
        .andWhere('u.createdAt >= :from', { from })
        .andWhere('u.createdAt <= :to', { to })
        .groupBy("TO_CHAR(u.createdAt, 'YYYY-MM-DD'), u.role")
        .orderBy("TO_CHAR(u.createdAt, 'YYYY-MM-DD')", 'ASC')
        .getRawMany<{ date: string; role: string; count: string }>(),
    ]);

    const totalTutors = Number(totals.find((r) => r.role === 'TUTOR')?.count ?? 0);
    const totalLearners = Number(totals.find((r) => r.role === 'LEARNER')?.count ?? 0);

    const growthMap = new Map<string, { tutors: number; learners: number }>();
    for (const row of growthRaw) {
      if (!growthMap.has(row.date)) growthMap.set(row.date, { tutors: 0, learners: 0 });
      const entry = growthMap.get(row.date)!;
      if (row.role === 'TUTOR') entry.tutors = Number(row.count);
      if (row.role === 'LEARNER') entry.learners = Number(row.count);
    }

    return {
      totalTutors,
      totalLearners,
      totalUsers: totalTutors + totalLearners,
      newThisWeek: Number(newThisWeekRaw?.count ?? 0),
      newThisMonth: Number(newThisMonthRaw?.count ?? 0),
      growthByDay: Array.from(growthMap.entries()).map(([date, v]) => ({
        date,
        tutors: v.tutors,
        learners: v.learners,
      })),
    };
  }

  private async getSessionMetrics(from: Date, to: Date) {
    const [totalsRaw, byDayRaw, byStatusRaw] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COUNT(*)', 'total')
        .addSelect("COUNT(*) FILTER (WHERE b.status = 'completed')", 'completed')
        .where('b.createdAt >= :from', { from })
        .andWhere('b.createdAt <= :to', { to })
        .getRawOne<{ total: string; completed: string }>(),

      this.bookingRepo
        .createQueryBuilder('b')
        .select("TO_CHAR(b.startTime, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('b.startTime >= :from', { from })
        .andWhere('b.startTime <= :to', { to })
        .groupBy("TO_CHAR(b.startTime, 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(b.startTime, 'YYYY-MM-DD')", 'ASC')
        .getRawMany<{ date: string; count: string }>(),

      this.bookingRepo
        .createQueryBuilder('b')
        .select('b.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('b.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    const total = Number(totalsRaw?.total ?? 0);
    const completed = Number(totalsRaw?.completed ?? 0);

    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byDay: byDayRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
      byStatus: byStatusRaw.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }

  private async getRevenueMetrics(from: Date, to: Date) {
    const [totalsRaw, byDayRaw, byStatusRaw] = await Promise.all([
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'gross')
        .addSelect('COALESCE(SUM(p.commissionAmount), 0)', 'commission')
        .where('p.status = :status', { status: 'COMPLETED' })
        .andWhere('p.deletedAt IS NULL')
        .andWhere('p.createdAt >= :from', { from })
        .andWhere('p.createdAt <= :to', { to })
        .getRawOne<{ gross: string; commission: string }>(),

      this.paymentRepo
        .createQueryBuilder('p')
        .select("TO_CHAR(p.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COALESCE(SUM(p.amount), 0)', 'gross')
        .addSelect('COALESCE(SUM(p.commissionAmount), 0)', 'commission')
        .where('p.status = :status', { status: 'COMPLETED' })
        .andWhere('p.deletedAt IS NULL')
        .andWhere('p.createdAt >= :from', { from })
        .andWhere('p.createdAt <= :to', { to })
        .groupBy("TO_CHAR(p.createdAt, 'YYYY-MM-DD')")
        .orderBy("TO_CHAR(p.createdAt, 'YYYY-MM-DD')", 'ASC')
        .getRawMany<{ date: string; gross: string; commission: string }>(),

      this.paymentRepo
        .createQueryBuilder('p')
        .select('p.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('p.deletedAt IS NULL')
        .groupBy('p.status')
        .getRawMany<{ status: string; count: string }>(),
    ]);

    return {
      grossTotal: Number(totalsRaw?.gross ?? 0),
      commissionTotal: Number(totalsRaw?.commission ?? 0),
      currency: 'COP' as const,
      byDay: byDayRaw.map((r) => ({
        date: r.date,
        gross: Number(r.gross),
        commission: Number(r.commission),
      })),
      byPaymentStatus: byStatusRaw.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }

  private async getNpsMetrics(from: Date, to: Date) {
    const distributionRaw = await this.reviewRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.deletedAt IS NULL')
      .andWhere('r.createdAt >= :from', { from })
      .andWhere('r.createdAt <= :to', { to })
      .groupBy('r.rating')
      .orderBy('r.rating', 'ASC')
      .getRawMany<{ rating: string; count: string }>();

    const total = distributionRaw.reduce((acc, r) => acc + Number(r.count), 0);
    const promoters = Number(distributionRaw.find((r) => r.rating === '5')?.count ?? 0);
    const detractors = distributionRaw
      .filter((r) => r.rating === '1' || r.rating === '2')
      .reduce((acc, r) => acc + Number(r.count), 0);

    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    const weightedSum = distributionRaw.reduce(
      (acc, r) => acc + Number(r.rating) * Number(r.count),
      0,
    );
    const avgRating = total > 0 ? Math.round((weightedSum / total) * 100) / 100 : 0;

    return {
      score: npsScore,
      averageRating: avgRating,
      totalReviews: total,
      distribution: distributionRaw.map((r) => ({
        rating: Number(r.rating),
        count: Number(r.count),
        percentage: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
      })),
    };
  }

  private async getTopTutors(from: Date, to: Date) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const rows = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.booking', 'b')
      .innerJoin(TutorEntity, 't', 't.id = b.tutor_id')
      .select('t.id', 'tutorId')
      .addSelect('t.nombre', 'nombre')
      .addSelect('t.apellido', 'apellido')
      .addSelect('t.rating', 'rating')
      .addSelect('COALESCE(SUM(p.amount), 0)', 'grossRevenue')
      .addSelect('COALESCE(SUM(p.commissionAmount), 0)', 'commission')
      .addSelect('COUNT(p.id)', 'sessionsCount')
      .where('p.status = :status', { status: 'COMPLETED' })
      .andWhere('p.deletedAt IS NULL')
      .andWhere('p.createdAt >= :from', { from: startOfMonth })
      .andWhere('p.createdAt <= :to', { to })
      .groupBy('t.id, t.nombre, t.apellido, t.rating')
      .orderBy('COALESCE(SUM(p.amount), 0)', 'DESC')
      .limit(5)
      .getRawMany<{
        tutorId: string;
        nombre: string;
        apellido: string;
        rating: string | null;
        grossRevenue: string;
        commission: string;
        sessionsCount: string;
      }>();

    return rows.map((r) => ({
      tutorId: r.tutorId,
      name: `${r.nombre} ${r.apellido}`,
      grossRevenue: Number(r.grossRevenue),
      commission: Number(r.commission),
      sessionsCount: Number(r.sessionsCount),
      averageRating: r.rating != null ? Number(r.rating) : null,
    }));
  }
}
