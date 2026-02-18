import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { BookingsDBService } from '../../database/dbservices/bookings.dbservice';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity, UserEntity, TutorEntity])],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsDBService],
  exports: [BookingsService, BookingsDBService],
})
export class BookingsModule {}

