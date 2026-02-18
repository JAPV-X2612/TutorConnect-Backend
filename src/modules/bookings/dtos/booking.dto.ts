import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BookingEntity } from '../../../database/entities/booking.entity';
import { UserEntity } from '../../../database/entities/user.entity';
import { TutorEntity } from '../../../database/entities/tutor.entity';

export class BookingDto {
  @ApiProperty({ example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @Expose()
  id: string;

  @ApiProperty({ type: () => UserEntity })
  @Expose()
  @Type(() => UserEntity)
  student: UserEntity;

  @ApiProperty({ type: () => TutorEntity })
  @Expose()
  @Type(() => TutorEntity)
  tutor: TutorEntity;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  @Expose()
  startTime: Date;

  @ApiProperty({ example: '2026-03-01T11:00:00.000Z', required: false })
  @Expose()
  endTime?: Date;

  @ApiProperty({ example: 'pending', enum: ['pending', 'confirmed', 'cancelled'] })
  @Expose()
  status: 'pending' | 'confirmed' | 'cancelled';

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  updatedAt: Date;
}
