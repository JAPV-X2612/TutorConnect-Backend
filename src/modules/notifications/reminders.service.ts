import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { FirebaseService } from '../firebase/firebase.service';

/**
 * Cron-based service that sends session reminder push notifications.
 *
 * Runs every hour and checks for confirmed bookings in two windows:
 * - 24-hour reminder: sessions starting between now + 22 h and now + 26 h
 * -  1-hour reminder: sessions starting between now + 30 min and now + 90 min
 *
 * Reminder flags on {@link BookingEntity} prevent duplicate sends across runs.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since 2026-05-03
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepo: Repository<TutorEntity>,
    private readonly firebase: FirebaseService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders(): Promise<void> {
    const now = new Date();
    await Promise.all([
      this.process24hReminders(now),
      this.process1hReminders(now),
    ]);
  }

  private async process24hReminders(now: Date): Promise<void> {
    const from = new Date(now.getTime() + 22 * 60 * 60_000);
    const to = new Date(now.getTime() + 26 * 60 * 60_000);

    const bookings = await this.bookingRepo.find({
      where: {
        status: 'confirmed',
        startTime: Between(from, to),
        reminder24hSentAt: IsNull(),
      },
      relations: ['student', 'tutor'],
    });

    for (const booking of bookings) {
      await this.sendReminderPair(booking, '24h');
      booking.reminder24hSentAt = new Date();
      await this.bookingRepo.save(booking);
    }

    if (bookings.length > 0) {
      this.logger.log(`24h reminders sent for ${bookings.length} session(s)`);
    }
  }

  private async process1hReminders(now: Date): Promise<void> {
    const from = new Date(now.getTime() + 30 * 60_000);
    const to = new Date(now.getTime() + 90 * 60_000);

    const bookings = await this.bookingRepo.find({
      where: {
        status: 'confirmed',
        startTime: Between(from, to),
        reminder1hSentAt: IsNull(),
      },
      relations: ['student', 'tutor'],
    });

    for (const booking of bookings) {
      await this.sendReminderPair(booking, '1h');
      booking.reminder1hSentAt = new Date();
      await this.bookingRepo.save(booking);
    }

    if (bookings.length > 0) {
      this.logger.log(`1h reminders sent for ${bookings.length} session(s)`);
    }
  }

  private async sendReminderPair(
    booking: BookingEntity,
    window: '24h' | '1h',
  ): Promise<void> {
    const subject = booking.subject ?? 'tu sesión';
    const timeStr = booking.startTime.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const title =
      window === '24h'
        ? 'Recordatorio de sesión'
        : '¡Tu sesión empieza pronto!';
    const body =
      window === '24h'
        ? `Mañana tienes una sesión de ${subject} a las ${timeStr}`
        : `Tu sesión de ${subject} comienza en 1 hora (${timeStr})`;
    const data = { type: 'booking', bookingId: booking.id };

    await this.notifyUser(booking.student, title, body, data);
    await this.notifyTutorUser(booking.tutor, title, body, data);
  }

  private async notifyUser(
    user: UserEntity,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    if (!user.fcmToken || user.notificationsEnabled === false) return;
    await this.firebase.sendPush(user.fcmToken, title, body, data);
  }

  private async notifyTutorUser(
    tutor: TutorEntity,
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<void> {
    const tutorUser = await this.userRepo.findOne({
      where: { clerkId: tutor.clerkId },
    });
    if (!tutorUser) return;
    await this.notifyUser(tutorUser, title, body, data);
  }
}
