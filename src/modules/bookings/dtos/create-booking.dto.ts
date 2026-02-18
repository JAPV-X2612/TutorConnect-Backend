import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsUUID, IsDateString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID del estudiante', example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @IsUUID()
  @Expose()
  studentId: string;

  @ApiProperty({ description: 'ID del tutor', example: 'c57b9a0f-4e6e-4bcb-8f13-ef8a0a3a2b34' })
  @IsUUID()
  @Expose()
  tutorId: string;

  @ApiProperty({ description: 'Inicio de la sesión (ISO)', example: '2026-03-01T10:00:00.000Z' })
  @IsDateString()
  @Expose()
  startTime: string;

  @ApiProperty({ description: 'Fin de la sesión (ISO)', example: '2026-03-01T11:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  @Expose()
  endTime?: string;
}
