import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannelEntity } from './entities/chat-channel.entity';
import { MessageEntity } from './entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { BookingEntity } from '../../database/entities/booking.entity';
import { MessagingDBService } from '../../database/dbservices/messaging.dbservice';
import { UsersDBService } from '../../database/dbservices/users.dbservice';
import { MessagingService } from './services/messaging.service';
import { MessagingGateway } from './gateways/messaging.gateway';
import { MessagingController } from './messaging.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatChannelEntity,
      MessageEntity,
      UserEntity, // ClerkJwtGuard + MessagingService
      TutorCourseEntity, // course reference on channel
      TutorEntity, // booking lookup via legacy tutors table
      BookingEntity, // active-booking check for expiry logic
    ]),
  ],
  controllers: [MessagingController],
  providers: [
    MessagingDBService,
    UsersDBService,
    MessagingService,
    MessagingGateway,
  ],
  exports: [MessagingService, MessagingGateway],
})
export class MessagingModule {}
