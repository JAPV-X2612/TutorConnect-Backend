import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsArray, ArrayNotEmpty, IsUUID, IsInt } from 'class-validator';

export class CreateTutorDto {
  @ApiProperty({ description: 'Usuario asociado (ID)', example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  @IsUUID()
  @Expose()
  userId: string;

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

  @ApiPropertyOptional({ description: 'Años de experiencia', example: 2 })
  @IsOptional()
  @IsInt()
  @Expose()
  experienceYears?: number;
}
