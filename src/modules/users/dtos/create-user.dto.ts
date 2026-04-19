import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

/**
 * Data transfer object for creating a new user profile.
 *
 * Sent by the client (or webhook handler) after a Clerk identity is created.
 * The {@link clerkId} must be unique and correspond to a valid Clerk subject.
 *
 * @author TutorConnect Team
 */
export class CreateUserDto {
  /**
   * Clerk external identifier (e.g. "user_2abc123").
   */
  @ApiProperty({ example: 'user_2abc123' })
  @IsString()
  @IsNotEmpty()
  @Expose()
  clerkId: string;

  /**
   * User's primary email address.
   */
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Expose()
  email: string;

  /**
   * User's given name.
   */
  @ApiProperty({ example: 'María' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Expose()
  firstName: string;

  /**
   * User's family name.
   */
  @ApiProperty({ example: 'López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Expose()
  lastName: string;

  /**
   * Platform role assigned to the user. Defaults to {@link UserRole.LEARNER}.
   */
  @ApiPropertyOptional({ example: UserRole.LEARNER, enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  @Expose()
  role?: UserRole;
}
