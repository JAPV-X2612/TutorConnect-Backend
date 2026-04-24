import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './entities/user.entity';
import { LearnerPreferenceEntity } from './entities/learner-preference.entity';
import { UsersDBService } from '../../database/dbservices/users.dbservice';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, LearnerPreferenceEntity])],
  controllers: [UsersController],
  providers: [UsersService, UsersDBService],
  exports: [UsersService, UsersDBService],
})
export class UsersModule {}
