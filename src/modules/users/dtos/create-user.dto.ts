import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'user_2abc123' })
  @IsString()
  @Expose()
  clerkId: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @Expose()
  email: string;

  @ApiProperty({ example: Role.APRENDIZ, enum: Role })
  @IsEnum(Role)
  @IsOptional()
  @Expose()
  role?: Role;
}
