import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { RemindersService } from './reminders.service';

/**
 * Module responsible for scheduled session reminder push notifications.
 *
 * {@link RemindersService} runs an hourly cron job that queries upcoming
 * confirmed bookings and dispatches FCM reminders via the global
 * {@link FirebaseModule}.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since 2026-05-03
 */
@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, UserEntity, TutorEntity])],
  providers: [RemindersService],
})
export class NotificationsModule {}
