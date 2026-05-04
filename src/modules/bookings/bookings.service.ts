import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { BookingsGateway } from './bookings.gateway';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepository: Repository<TutorEntity>,
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepository: Repository<TutorCourseEntity>,
    @Inject(forwardRef(() => BookingsGateway))
    private readonly gateway: BookingsGateway,
    private readonly firebase: FirebaseService,
  ) {}

  // ── POST /bookings ────────────────────────────────────────────────────────

  async createBooking(
    learnerClerkId: string,
    courseId: string,
    scheduledAt: string,
    notes?: string,
  ): Promise<object> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const course = await this.courseRepository.findOne({
      where: { id: courseId, isActive: true },
      relations: ['tutor'],
    });
    if (!course) throw new NotFoundException('Curso no encontrado');

    const startTime = new Date(scheduledAt);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    const endTime = new Date(startTime.getTime() + course.duration * 60_000);

    // Block if tutor already has a CONFIRMED booking in this slot.
    const tutorConflict = await this.hasConflict({
      tutorId: course.tutor.id,
      startTime,
      endTime,
      confirmedOnly: true,
    });
    if (tutorConflict.conflict) {
      throw new ConflictException(
        'El tutor ya tiene una clase confirmada en ese horario',
      );
    }

    // Block if this student already has any active booking (pending or confirmed) in this slot.
    const studentConflict = await this.hasConflict({
      studentId: learner.id,
      startTime,
      endTime,
    });
    if (studentConflict.conflict) {
      throw new ConflictException(
        'Ya tienes una clase reservada en ese horario',
      );
    }

    const booking = this.bookingRepository.create({
      student: learner,
      tutor: course.tutor,
      course,
      startTime,
      endTime,
      subject: course.subject,
      price: course.price,
      notes: notes ?? null,
      status: 'pending',
    });

    const saved = await this.bookingRepository.save(booking);
    const result = this.formatBooking(saved, {
      includeTutor: true,
      includeCourse: true,
    });
    // Notify tutor via WebSocket + FCM (fire-and-forget).
    this.gateway.notifyTutor(course.tutor.clerkId, result);
    void this.pushToTutor(
      course.tutor.clerkId,
      'Nueva solicitud de sesión',
      `${learner.firstName} ${learner.lastName} quiere una sesión de ${course.subject}`,
      { type: 'booking', bookingId: saved.id },
    );
    return result;
  }

  // ── GET /bookings/me (learner) ────────────────────────────────────────────

  async getLearnerBookings(clerkId: string): Promise<object[]> {
    const learner = await this.userRepository.findOne({ where: { clerkId } });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const bookings = await this.bookingRepository.find({
      where: { student: { id: learner.id } },
      relations: ['tutor', 'course'],
      order: { startTime: 'DESC' },
    });

    return bookings.map((b) =>
      this.formatBooking(b, { includeTutor: true, includeCourse: true }),
    );
  }

  // ── GET /bookings/tutor (tutor) ───────────────────────────────────────────

  async getTutorBookings(tutorClerkId: string): Promise<object[]> {
    const tutor = await this.tutorRepository.findOne({
      where: { clerkId: tutorClerkId },
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');

    const bookings = await this.bookingRepository.find({
      where: { tutor: { id: tutor.id } },
      relations: ['student', 'course'],
      order: { startTime: 'DESC' },
    });

    return bookings.map((b) =>
      this.formatBooking(b, { includeLearner: true, includeCourse: true }),
    );
  }

  // ── PATCH /bookings/:id/status ────────────────────────────────────────────

  async respondToBooking(
    bookingId: string,
    tutorClerkId: string,
    status: 'confirmed' | 'cancelled',
  ): Promise<object> {
    const tutor = await this.tutorRepository.findOne({
      where: { clerkId: tutorClerkId },
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['tutor', 'student', 'course'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.tutor.id !== tutor.id)
      throw new ForbiddenException('Acceso denegado');
    if (booking.status !== 'pending') {
      throw new BadRequestException(
        'Solo se pueden gestionar reservas pendientes',
      );
    }

    if (status === 'confirmed') {
      if (!booking.endTime)
        throw new BadRequestException('Reserva sin hora de fin');

      // Ensure no confirmed booking already occupies this slot.
      const { conflict, who } = await this.hasConflict({
        tutorId: tutor.id,
        studentId: booking.student?.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        excludeBookingId: booking.id,
        confirmedOnly: true,
      });
      if (conflict) {
        throw new ConflictException(
          who === 'tutor'
            ? 'Ya tienes otra clase confirmada en ese horario'
            : 'El estudiante ya tiene otra clase confirmada en ese horario',
        );
      }
    }

    booking.status = status;
    const saved = await this.bookingRepository.save(booking);

    // Auto-cancel other pending requests from different students in the same slot.
    if (status === 'confirmed' && booking.endTime) {
      await this.cancelOverlappingPending(
        tutor.id,
        booking.startTime,
        booking.endTime,
        booking.id,
      );
    }

    const result = this.formatBooking(saved, {
      includeLearner: true,
      includeCourse: true,
    });
    // Notify learner via WebSocket + FCM (fire-and-forget).
    this.gateway.notifyLearner(booking.student.clerkId, result);
    const subject = booking.subject ?? 'tu sesión';
    const pushTitle =
      status === 'confirmed' ? 'Sesión confirmada' : 'Solicitud rechazada';
    const pushBody =
      status === 'confirmed'
        ? `Tu sesión de ${subject} fue confirmada`
        : `El tutor no pudo confirmar tu sesión de ${subject}`;
    void this.pushToUser(booking.student, pushTitle, pushBody, {
      type: 'booking',
      bookingId: booking.id,
    });
    return result;
  }

  // ── Learner cancel ────────────────────────────────────────────────────────

  async cancelBooking(
    bookingId: string,
    learnerClerkId: string,
  ): Promise<object> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['student', 'tutor', 'course'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.student.id !== learner.id)
      throw new ForbiddenException('Acceso denegado');
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException('No se puede cancelar esta reserva');
    }

    booking.status = 'cancelled';
    const saved = await this.bookingRepository.save(booking);
    const result = this.formatBooking(saved, {
      includeTutor: true,
      includeCourse: true,
    });
    // Notify tutor via WebSocket + FCM (fire-and-forget).
    this.gateway.notifyTutor(booking.tutor.clerkId, result);
    const subject = booking.subject ?? 'la sesión';
    void this.pushToTutor(
      booking.tutor.clerkId,
      'Sesión cancelada',
      `El aprendiz canceló la sesión de ${subject}`,
      { type: 'booking', bookingId: booking.id },
    );
    return result;
  }

  // ── Learner reschedule ────────────────────────────────────────────────────

  /**
   * Moves an existing booking to a new time slot requested by the learner.
   *
   * If the booking was already confirmed, it reverts to pending so the tutor
   * must re-confirm the new slot. The tutor is notified via WebSocket in both cases.
   *
   * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
   * @version 1.0
   * @since 2026-05-03
   */
  async rescheduleBooking(
    bookingId: string,
    learnerClerkId: string,
    newStartTime: string,
  ): Promise<object> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['student', 'tutor', 'course'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');
    if (booking.student.id !== learner.id)
      throw new ForbiddenException('Acceso denegado');
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new BadRequestException(
        'Solo se pueden reprogramar reservas pendientes o confirmadas',
      );
    }

    const startTime = new Date(newStartTime);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }

    // Preserve original session length when course is no longer linked.
    const durationMs = booking.course
      ? booking.course.duration * 60_000
      : booking.endTime
        ? booking.endTime.getTime() - booking.startTime.getTime()
        : 60 * 60_000;

    const endTime = new Date(startTime.getTime() + durationMs);

    const tutorConflict = await this.hasConflict({
      tutorId: booking.tutor.id,
      startTime,
      endTime,
      excludeBookingId: booking.id,
      confirmedOnly: true,
    });
    if (tutorConflict.conflict) {
      throw new ConflictException(
        'El tutor ya tiene una clase confirmada en ese horario',
      );
    }

    const studentConflict = await this.hasConflict({
      studentId: learner.id,
      startTime,
      endTime,
      excludeBookingId: booking.id,
    });
    if (studentConflict.conflict) {
      throw new ConflictException(
        'Ya tienes una clase reservada en ese horario',
      );
    }

    const previousStatus = booking.status;
    booking.startTime = startTime;
    booking.endTime = endTime;
    // Confirmed booking reverts to pending — tutor must re-confirm the new slot.
    if (booking.status === 'confirmed') {
      booking.status = 'pending';
    }

    const saved = await this.bookingRepository.save(booking);
    const result = this.formatBooking(saved, {
      includeTutor: true,
      includeCourse: true,
    });
    this.gateway.notifyTutor(booking.tutor.clerkId, {
      ...result,
      rescheduled: true,
      previousStatus,
    });
    return result;
  }

  // ── Conflict detection ────────────────────────────────────────────────────

  /**
   * Returns true if an active booking (pending or confirmed) overlaps the
   * given [startTime, endTime) interval for the specified tutor or student.
   *
   * Two intervals overlap when: existingStart < newEnd AND existingEnd > newStart
   */
  private async hasConflict(opts: {
    tutorId?: string;
    studentId?: string | number | bigint;
    startTime: Date;
    endTime: Date;
    excludeBookingId?: string;
    confirmedOnly?: boolean;
  }): Promise<{ conflict: boolean; who: 'tutor' | 'student' | null }> {
    const statuses = opts.confirmedOnly
      ? ['confirmed']
      : ['pending', 'confirmed'];

    const qb = this.bookingRepository
      .createQueryBuilder('b')
      .where('b.status IN (:...statuses)', { statuses })
      .andWhere('b.startTime < :endTime', { endTime: opts.endTime })
      .andWhere('b.endTime > :startTime', { startTime: opts.startTime });

    if (opts.excludeBookingId) {
      qb.andWhere('b.id != :excludeId', { excludeId: opts.excludeBookingId });
    }

    if (opts.tutorId) {
      const count = await qb
        .clone()
        .andWhere('b.tutor_id = :tutorId', { tutorId: opts.tutorId })
        .getCount();
      if (count > 0) return { conflict: true, who: 'tutor' };
    }

    if (opts.studentId) {
      const count = await qb
        .clone()
        .andWhere('b.student_id = :studentId', { studentId: opts.studentId })
        .getCount();
      if (count > 0) return { conflict: true, who: 'student' };
    }

    return { conflict: false, who: null };
  }

  /**
   * Cancels all pending bookings for the same tutor that overlap with the
   * confirmed booking's interval, excluding the confirmed booking itself.
   */
  private async cancelOverlappingPending(
    tutorId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId: string,
  ): Promise<void> {
    const overlapping = await this.bookingRepository
      .createQueryBuilder('b')
      .where('b.tutor_id = :tutorId', { tutorId })
      .andWhere('b.status = :status', { status: 'pending' })
      .andWhere('b.startTime < :endTime', { endTime })
      .andWhere('b.endTime > :startTime', { startTime })
      .andWhere('b.id != :excludeId', { excludeId: excludeBookingId })
      .getMany();

    for (const b of overlapping) {
      b.status = 'cancelled';
      await this.bookingRepository.save(b);
      if (b.student?.clerkId) {
        this.gateway.notifyLearner(b.student.clerkId, {
          bookingId: b.id,
          status: 'cancelled',
          reason: 'El tutor confirmó otra reserva en el mismo horario',
        });
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private formatBooking(
    b: BookingEntity,
    opts: {
      includeTutor?: boolean;
      includeLearner?: boolean;
      includeCourse?: boolean;
    },
  ): object {
    return {
      id: b.id,
      status: b.status,
      subject: b.subject,
      price: b.price,
      startTime: b.startTime,
      endTime: b.endTime,
      notes: b.notes,
      createdAt: b.createdAt,
      ...(opts.includeTutor && b.tutor
        ? {
            tutor: {
              id: b.tutor.id,
              clerkId: b.tutor.clerkId,
              nombre: b.tutor.nombre,
              apellido: b.tutor.apellido,
            },
          }
        : {}),
      ...(opts.includeLearner && b.student
        ? {
            learner: {
              id: b.student.id,
              clerkId: b.student.clerkId,
              firstName: b.student.firstName,
              lastName: b.student.lastName,
              email: b.student.email,
            },
          }
        : {}),
      ...(opts.includeCourse && b.course
        ? {
            course: {
              id: b.course.id,
              subject: b.course.subject,
              duration: b.course.duration,
              modalidad: b.course.modalidad,
            },
          }
        : {}),
    };
  }

  // ── Push notification helpers ─────────────────────────────────────────────

  /** Sends FCM to a UserEntity if they have a token and notifications enabled. */
  private async pushToUser(
    user: UserEntity,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (!user.fcmToken || user.notificationsEnabled === false) return;
    await this.firebase.sendPush(user.fcmToken, title, body, data);
  }

  /** Looks up the UserEntity for a tutor by clerkId, then sends FCM. */
  private async pushToTutor(
    tutorClerkId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    const tutorUser = await this.userRepository.findOne({
      where: { clerkId: tutorClerkId },
    });
    if (!tutorUser) return;
    await this.pushToUser(tutorUser, title, body, data);
  }
}
