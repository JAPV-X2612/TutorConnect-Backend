import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { UserEntity } from './entities/user.entity';
import { TutorEntity } from './entities/tutor.entity';
import { BookingEntity } from './entities/booking.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [UserEntity, TutorEntity, BookingEntity],
        synchronize: process.env.NODE_ENV !== 'production', // Solo en desarrollo
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}

