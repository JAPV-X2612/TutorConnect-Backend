import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../bookings/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * NestJS module for the learner and tutor dashboard feature
 * (MOD-USR-002 / HU-06 learner / HU-07 tutor).
 *
 * @author TutorConnect Team
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([BookingEntity, ReviewEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
