import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorsService } from './tutors.service';
import { TutorsController } from './tutors.controller';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { TutorsDBService } from '../../database/dbservices/tutors.dbservice';

@Module({
  imports: [TypeOrmModule.forFeature([TutorEntity, UserEntity])],
  controllers: [TutorsController],
  providers: [TutorsService, TutorsDBService],
  exports: [TutorsService, TutorsDBService],
})
export class TutorsModule {}

