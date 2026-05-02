import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TutorDto {
  @ApiProperty({ example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'user_2abc123' })
  @Expose()
  clerkId: string;

  @ApiProperty({ example: 'tutor@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Biografía del tutor', required: false })
  @Expose()
  bio?: string;

  @ApiProperty({ description: 'Lista de materias' })
  @Expose()
  subjects?: string[];

  @ApiProperty({ example: 4.5, required: false })
  @Expose()
  rating?: number;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-02-17T18:05:02.000Z' })
  @Expose()
  updatedAt: Date;
}
