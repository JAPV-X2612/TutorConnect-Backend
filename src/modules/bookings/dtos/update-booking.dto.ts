import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateBookingDto {
  @ApiPropertyOptional({ description: 'Inicio de la sesión (ISO)' })
  @IsOptional()
  @IsDateString()
  @Expose()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Fin de la sesión (ISO)' })
  @IsOptional()
  @IsDateString()
  @Expose()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Estado', enum: ['pending', 'confirmed', 'cancelled'] })
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'cancelled'])
  @Expose()
  status?: 'pending' | 'confirmed' | 'cancelled';
}
