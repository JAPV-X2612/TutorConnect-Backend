import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { BookingsGateway } from './bookings.gateway';

@Injectable()
export class BookingsService {
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
    // Notify tutor that a new booking request arrived.
    this.gateway.notifyTutor(course.tutor.clerkId, result);
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
    if (booking.tutor.id !== tutor.id) throw new ForbiddenException('Acceso denegado');
    if (booking.status !== 'pending') {
      throw new BadRequestException(
        'Solo se pueden gestionar reservas pendientes',
      );
    }

    booking.status = status;
    const saved = await this.bookingRepository.save(booking);
    const result = this.formatBooking(saved, {
      includeLearner: true,
      includeCourse: true,
    });
    // Notify learner that the tutor responded.
    this.gateway.notifyLearner(booking.student.clerkId, result);
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
    if (booking.student.id !== learner.id) throw new ForbiddenException('Acceso denegado');
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw new BadRequestException('No se puede cancelar esta reserva');
    }

    booking.status = 'cancelled';
    const saved = await this.bookingRepository.save(booking);
    const result = this.formatBooking(saved, {
      includeTutor: true,
      includeCourse: true,
    });
    // Notify tutor that the learner cancelled.
    this.gateway.notifyTutor(booking.tutor.clerkId, result);
    return result;
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
}
