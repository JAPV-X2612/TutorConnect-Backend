import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TutorEntity } from '../../../database/entities/tutor.entity';
import { UserEntity } from '../../../database/entities/user.entity';

export class TutorDto {
  @ApiProperty({ example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @Expose()
  id: string;

  @ApiProperty({ type: () => UserEntity })
  @Expose()
  @Type(() => UserEntity)
  user: UserEntity;

  @ApiProperty({ description: 'Biografía del tutor', required: false })
  @Expose()
  bio?: string;

  @ApiProperty({ description: 'Lista de materias' })
  @Expose()
  subjects?: string[];

  @ApiProperty({ example: 4.5, required: false })
  @Expose()
  rating?: number;

  @ApiProperty({ example: 3, required: false })
  @Expose()
  experienceYears?: number;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  updatedAt: Date;
}
