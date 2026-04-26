import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorsService } from './tutors.service';
import { TutorsController } from './tutors.controller';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { CertificacionEntity } from '../../database/entities/certificacion.entity';
import { TutorsDBService } from '../../database/dbservices/tutors.dbservice';
import { StorageModule } from '../../storage/storage.module';
import { TutorTopicEntity } from './entities/tutor-topic.entity';
import { TutorCourseEntity } from './entities/tutor-course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutorEntity,
      UserEntity,
      CertificacionEntity,
      TutorTopicEntity,
      TutorCourseEntity,
    ]),
    StorageModule,
  ],
  controllers: [TutorsController],
  providers: [TutorsService, TutorsDBService],
  exports: [TutorsService, TutorsDBService],
})
export class TutorsModule {}
