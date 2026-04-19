import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsOptional, IsArray, IsInt, IsPositive } from 'class-validator';

export class CreateTutorDto {
  @ApiProperty({
    description: 'Internal numeric id of the associated user (UserEntity.id)',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @Expose()
  userId: number;

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
