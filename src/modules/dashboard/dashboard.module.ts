import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { BookingEntity as NewBookingEntity } from '../bookings/entities/booking.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      ReviewEntity,
      NewBookingEntity,
    ]),
    AuthModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
