import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import {
  MetricasTutorDto,
  ProximaSesionDto,
  TutorDashboardResponseDto,
} from './dto/tutor-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
  ) {}

  async getTutorDashboard(clerkId: string): Promise<TutorDashboardResponseDto> {
    const [metricas, proximas_sesiones] = await Promise.all([
      this.getMetricasTutor(clerkId),
      this.getProximasSesionesTutor(clerkId),
    ]);

    return { metricas, proximas_sesiones };
  }

  // ── Métricas del mes actual ────────────────────────────────────────────────

  private async getMetricasTutor(clerkId: string): Promise<MetricasTutorDto> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [sessionRaw, reviewRaw] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .select('COUNT(b.id)', 'total_sesiones')
        .addSelect('COALESCE(SUM(b.price), 0)', 'ingresos_totales')
        .innerJoin('b.tutor', 't', 't.clerkId = :clerkId', { clerkId })
        .where('b.status = :status', { status: 'completed' })
        .andWhere('b.startTime >= :monthStart', { monthStart })
        .andWhere('b.startTime < :monthEnd', { monthEnd })
        .getRawOne<{ total_sesiones: string; ingresos_totales: string }>(),

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
      ingresos_totales: Number(sessionRaw?.ingresos_totales ?? 0),
      moneda: 'COP',
      periodo,
      calificacion_promedio:
        promedioRaw != null
          ? Math.round(Number(promedioRaw) * 100) / 100
          : null,
      total_resenas: Number(reviewRaw?.total_resenas ?? 0),
    };
  }

  // ── Próximas 5 sesiones agendadas ─────────────────────────────────────────

  private async getProximasSesionesTutor(
    clerkId: string,
  ): Promise<ProximaSesionDto[]> {
    const bookings = await this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.student', 'student')
      .innerJoin('b.tutor', 't', 't.clerkId = :clerkId', { clerkId })
      .where('b.status = :status', { status: 'confirmed' })
      .andWhere('b.startTime > :now', { now: new Date() })
      .orderBy('b.startTime', 'ASC')
      .take(5)
      .getMany();

    return bookings.map((b) => ({
      id: b.id,
      fecha: b.startTime,
      aprendiz_nombre: b.student
        ? `${b.student.firstName} ${b.student.lastName}`.trim()
        : 'N/A',
      materia: b.subject,
    }));
  }
}
