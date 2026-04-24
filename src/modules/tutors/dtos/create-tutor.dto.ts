import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEmail, IsInt } from 'class-validator';

export class CreateTutorDto {
  @ApiProperty({ description: 'Clerk ID del tutor', example: 'user_2abc123' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  clerkId: string;

  @ApiProperty({ description: 'Email del tutor', example: 'tutor@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Expose()
  email: string;

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
