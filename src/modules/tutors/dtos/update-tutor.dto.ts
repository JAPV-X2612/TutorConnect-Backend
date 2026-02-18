import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsInt } from 'class-validator';

export class UpdateTutorDto {
  @ApiPropertyOptional({ description: 'Biografía del tutor' })
  @IsOptional()
  @IsString()
  @Expose()
  bio?: string;

  @ApiPropertyOptional({ description: 'Lista de materias' })
  @IsOptional()
  @IsArray()
  @Expose()
  subjects?: string[];

  @ApiPropertyOptional({ description: 'Años de experiencia' })
  @IsOptional()
  @IsInt()
  @Expose()
  experienceYears?: number;
}
