import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { GeminiEmbeddingService } from './gemini-embedding.service';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TutorCourseEntity, UserEntity])],
  controllers: [SearchController],
  providers: [SearchService, GeminiEmbeddingService],
  exports: [SearchService],
})
export class SearchModule {}
