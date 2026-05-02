import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity } from './entities/review.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ReviewsService } from './services/reviews.service';
import { ReviewsController } from './controllers/reviews.controller';

/**
 * Wires the reviews feature: entity registration, service, and controller.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-02
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ReviewEntity, BookingEntity, UserEntity]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
