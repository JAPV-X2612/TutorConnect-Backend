import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

/**
 * Data transfer object for partially updating an existing user profile.
 *
 * All fields are optional; only the provided fields are updated.
 *
 * @author TutorConnect Team
 */
export class UpdateUserDto {
  /**
   * Updated given name.
   */
  @ApiPropertyOptional({ example: 'María' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Expose()
  firstName?: string;

  /**
   * Updated family name.
   */
  @ApiPropertyOptional({ example: 'López' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Expose()
  lastName?: string;

  /**
   * Updated primary email address.
   */
  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  @Expose()
  email?: string;

  /**
   * Updated platform role.
   */
  @ApiPropertyOptional({ example: UserRole.TUTOR, enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  @Expose()
  role?: UserRole;

  /**
   * Updated account status.
   */
  @ApiPropertyOptional({ example: UserStatus.ACTIVE, enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  @Expose()
  status?: UserStatus;
}
