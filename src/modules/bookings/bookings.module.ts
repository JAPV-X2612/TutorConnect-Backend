import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsGateway } from './bookings.gateway';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      UserEntity,
      TutorEntity,
      TutorCourseEntity,
      PaymentEntity,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsGateway],
  exports: [BookingsService, BookingsGateway],
})
export class BookingsModule {}
