import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsEmail, IsIn } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'María López' })
  @IsOptional()
  @IsString()
  @Expose()
  name?: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  @Expose()
  email?: string;

  @ApiPropertyOptional({ example: 'tutor', enum: ['student', 'tutor'] })
  @IsOptional()
  @IsIn(['student', 'tutor'])
  @Expose()
  role?: 'student' | 'tutor';
}
