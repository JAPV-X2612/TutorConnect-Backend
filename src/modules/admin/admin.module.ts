import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TutorEntity, TutorCourseEntity]),
    SearchModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
