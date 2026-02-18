import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsEmail, IsIn } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  @Expose()
  name: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @Expose()
  email: string;

  @ApiProperty({ example: 'student', enum: ['student', 'tutor'] })
  @IsIn(['student', 'tutor'])
  @Expose()
  role: 'student' | 'tutor';
}
