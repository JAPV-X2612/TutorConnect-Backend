import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { InitiatePaymentDto } from './dtos/requests/initiate-payment.dto';
import { BookingsGateway } from '../bookings/bookings.gateway';

const COMMISSION_RATE = 0.15;


interface GatewayResult {
  approved: boolean;
  errorCode?: string;
  errorMessage?: string;
}

interface TimerEntry {
  timer: ReturnType<typeof setTimeout>;
  expiresAt: Date;
}

@Injectable()
export class PaymentsService {
  private readonly paymentTimers = new Map<string, TimerEntry>();

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepo: Repository<TutorEntity>,
    private readonly gateway: BookingsGateway,
  ) {}

  // ── GET /payments/bookings/:id/summary ─────────────────────────────────────

  async getBookingSummary(bookingId: string, learnerClerkId: string) {
    const learner = await this.userRepo.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['student', 'tutor', 'course'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.student.id !== learner.id)
      throw new ForbiddenException('Acceso denegado');
    if (booking.status !== 'pending') {
      throw new BadRequestException(
        booking.status === 'cancelled'
          ? 'El tiempo para completar el pago expiró. Crea una nueva reserva.'
          : `Esta reserva no está pendiente de pago (estado: ${booking.status})`,
      );
    }

    const amount = Number(booking.price ?? 0);
    const commissionAmount = round2(amount * COMMISSION_RATE);

    this.scheduleAutoCancel(bookingId);

    return {
      bookingId: booking.id,
      tutor: {
        nombre: booking.tutor.nombre,
        apellido: booking.tutor.apellido,
      },
      course: booking.course
        ? {
            subject: booking.course.subject,
            duration: booking.course.duration,
            modalidad: booking.course.modalidad,
          }
        : null,
      subject: booking.subject,
      startTime: booking.startTime,
      endTime: booking.endTime ?? null,
      paymentBreakdown: {
        grossAmount: amount,
        commissionRate: COMMISSION_RATE,
        commissionAmount,
        netAmount: round2(amount - commissionAmount),
        currency: 'COP',
      },
      gateway: 'TutorConnect Mock Gateway',
      paymentExpiresAt: this.getTimerExpiry(bookingId),
    };
  }

  // ── POST /payments/bookings/:id/pay ────────────────────────────────────────

  async processPayment(
    bookingId: string,
    learnerClerkId: string,
    dto: InitiatePaymentDto,
  ) {
    const learner = await this.userRepo.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner not found');

    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['student', 'tutor', 'course'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.student.id !== learner.id)
      throw new ForbiddenException('Acceso denegado');
    if (booking.status !== 'pending') {
      throw new BadRequestException(
        booking.status === 'cancelled'
          ? 'El tiempo para completar el pago expiró. Crea una nueva reserva.'
          : `Esta reserva no está disponible para pago (estado: ${booking.status})`,
      );
    }

    const amount = Number(booking.price ?? 0);
    const commissionAmount = round2(amount * COMMISSION_RATE);

    const gatewayResult = this.runMockGateway(dto);
    const paymentStatus = gatewayResult.approved
      ? PaymentStatus.COMPLETED
      : PaymentStatus.FAILED;

    const payment = this.paymentRepo.create({
      amount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      status: paymentStatus,
      booking,
      learner,
    });
    const saved = await this.paymentRepo.save(payment);

    if (gatewayResult.approved) {
      this.clearTimer(bookingId);
      this.clearTimer(bookingId);

      const notif = {
        event: 'payment:received',
        bookingId: booking.id,
        bookingStatus: 'pending',
        paymentId: saved.id,
        receiptNumber: buildReceiptNumber(saved.id),
        subject: booking.subject,
        startTime: booking.startTime,
        endTime: booking.endTime ?? null,
        learner: {
          firstName: learner.firstName,
          lastName: learner.lastName,
        },
        tutor: {
          nombre: booking.tutor.nombre,
          apellido: booking.tutor.apellido,
        },
      };
      // Tutor gets notified to confirm; learner knows payment went through.
      this.gateway.notifyTutor(booking.tutor.clerkId, notif);
      this.gateway.notifyLearner(learnerClerkId, notif);
    }

    return {
      paymentId: saved.id,
      bookingId,
      status: paymentStatus,
      approved: gatewayResult.approved,
      amount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      netAmount: round2(amount - commissionAmount),
      currency: 'COP',
      receiptNumber: gatewayResult.approved ? buildReceiptNumber(saved.id) : null,
      errorCode: gatewayResult.errorCode ?? null,
      errorMessage: gatewayResult.errorMessage ?? null,
      booking: {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime ?? null,
        subject: booking.subject,
        tutor: {
          nombre: booking.tutor.nombre,
          apellido: booking.tutor.apellido,
        },
      },
      processedAt: saved.createdAt,
    };
  }

  // ── GET /payments/tutor/history ─────────────────────────────────────────────

  async getTutorPaymentHistory(
    tutorClerkId: string,
    from?: string,
    to?: string,
  ) {
    const tutor = await this.tutorRepo.findOne({
      where: { clerkId: tutorClerkId },
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.booking', 'b')
      .innerJoinAndSelect('p.learner', 'l')
      .innerJoin('b.tutor', 't', 't.id = :tutorId', { tutorId: tutor.id })
      .where('p.status = :status', { status: PaymentStatus.COMPLETED })
      .andWhere('b.status IN (:...bookingStatuses)', { bookingStatuses: ['confirmed', 'completed'] })
      .orderBy('b.startTime', 'DESC');

    if (from) qb.andWhere('b.startTime >= :from', { from: new Date(from) });
    if (to) qb.andWhere('b.startTime <= :to', { to: new Date(to) });

    const payments = await qb.getMany();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const monthPayments = payments.filter(
      (p) =>
        p.booking.startTime >= monthStart && p.booking.startTime <= monthEnd,
    );

    const sumPayments = (arr: PaymentEntity[]) => ({
      gross: arr.reduce((s, p) => s + Number(p.amount), 0),
      commission: arr.reduce((s, p) => s + Number(p.commissionAmount), 0),
    });

    const filterTotals = sumPayments(payments);
    const monthTotals = sumPayments(monthPayments);

    const history = payments.map((p) => ({
      paymentId: p.id,
      bookingId: p.booking.id,
      learnerName: `${p.learner.firstName} ${p.learner.lastName}`.trim(),
      sessionDate: p.booking.startTime,
      subject: p.booking.subject,
      grossAmount: Number(p.amount),
      commissionRate: Number(p.commissionRate),
      commissionAmount: Number(p.commissionAmount),
      netAmount: round2(Number(p.amount) - Number(p.commissionAmount)),
      currency: 'COP',
      receiptNumber: buildReceiptNumber(p.id),
      paidAt: p.createdAt,
    }));

    return {
      period,
      monthlySummary: {
        totalSessions: monthPayments.length,
        grossRevenue: round2(monthTotals.gross),
        totalCommission: round2(monthTotals.commission),
        netRevenue: round2(monthTotals.gross - monthTotals.commission),
        currency: 'COP',
      },
      filterSummary: {
        totalSessions: payments.length,
        grossRevenue: round2(filterTotals.gross),
        totalCommission: round2(filterTotals.commission),
        netRevenue: round2(filterTotals.gross - filterTotals.commission),
        currency: 'COP',
      },
      history,
    };
  }

  // ── Mock gateway ────────────────────────────────────────────────────────────

  private runMockGateway(_dto: InitiatePaymentDto): GatewayResult {
    return { approved: true };
  }

  // ── Auto-cancel timer (10 min on payment flow) ─────────────────────────────

  private scheduleAutoCancel(bookingId: string): void {
    if (this.paymentTimers.has(bookingId)) return;

    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);
    const timer = setTimeout(() => {
      this.paymentTimers.delete(bookingId);
      void this.bookingRepo
        .findOne({ where: { id: bookingId } })
        .then((booking) => {
          if (booking && booking.status === 'pending') {
            booking.status = 'cancelled';
            return this.bookingRepo.save(booking);
          }
        })
        .catch(() => {});
    }, 10 * 60 * 1_000);

    this.paymentTimers.set(bookingId, { timer, expiresAt });
  }

  private clearTimer(bookingId: string): void {
    const entry = this.paymentTimers.get(bookingId);
    if (entry) {
      clearTimeout(entry.timer);
      this.paymentTimers.delete(bookingId);
    }
  }

  private getTimerExpiry(bookingId: string): Date | null {
    return this.paymentTimers.get(bookingId)?.expiresAt ?? null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildReceiptNumber(paymentId: number): string {
  return `TC-${paymentId.toString().padStart(8, '0')}`;
}
