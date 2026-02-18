import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserEntity } from '../../../database/entities/user.entity';

export class UserDto {
  @ApiProperty({ example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'María López' })
  @Expose()
  name: string;

  @ApiProperty({ example: 'maria@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'student', enum: ['student', 'tutor'] })
  @Expose()
  role: 'student' | 'tutor';

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  updatedAt: Date;
}
