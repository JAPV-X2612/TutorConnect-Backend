import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminMetricsService } from './admin-metrics.service';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { ReviewEntity } from '../reviews/entities/review.entity';
import { SearchModule } from '../search/search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      TutorEntity,
      TutorCourseEntity,
      BookingEntity,
      PaymentEntity,
      ReviewEntity,
    ]),
    SearchModule,
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminMetricsService],
})
export class AdminModule {}
