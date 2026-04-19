import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
  IsArray,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

/**
 * Data transfer object for creating a new user profile.
 *
 * Sent by the client (or webhook handler) after a Clerk identity is created.
 * The {@link clerkId} must be unique and correspond to a valid Clerk subject.
 *
 * Role-specific validation is enforced at the service layer:
 * - LEARNER registrations must include at least one {@link interests} entry and an {@link organizationName}.
 * - TUTOR registrations must include {@link specialties} and an {@link hourlyRate}.
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

  // ── Location & institutional fields ──────────────────────────────────────────

  /**
   * City where the user is located.
   * Normalized to uppercase before persistence for consistent search matching.
   */
  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Expose()
  city?: string;

  /**
   * Country of the user. Defaults to 'Colombia' when omitted.
   */
  @ApiPropertyOptional({ example: 'Colombia', default: 'Colombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Expose()
  country?: string;

  /**
   * Name of the university or company the user belongs to.
   * Required for LEARNER registrations.
   * Normalized to uppercase before persistence for institutional matching.
   */
  @ApiPropertyOptional({ example: 'Escuela Colombiana de Ingeniería' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Expose()
  organizationName?: string;

  /**
   * Academic program or field of study (e.g. 'Systems Engineering').
   */
  @ApiPropertyOptional({ example: 'Systems Engineering' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Expose()
  program?: string;

  // ── Learner-specific fields ───────────────────────────────────────────────────

  /**
   * Subject areas the learner is interested in.
   * Required for LEARNER registrations — must contain at least one entry.
   */
  @ApiPropertyOptional({ example: ['Mathematics', 'Physics'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Expose()
  interests?: string[];

  /**
   * Current academic semester of the learner (1-based).
   */
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Expose()
  currentSemester?: number;

  // ── Tutor-specific fields ─────────────────────────────────────────────────────

  /**
   * Subject areas in which the tutor offers services.
   * Required for TUTOR registrations — must contain at least one entry.
   */
  @ApiPropertyOptional({ example: ['Calculus', 'Linear Algebra'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Expose()
  specialties?: string[];

  /**
   * Number of years of tutoring or professional experience.
   */
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Expose()
  experienceYears?: number;

  /**
   * Tutor's hourly rate in the platform currency (COP).
   * Required for TUTOR registrations.
   */
  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Expose()
  hourlyRate?: number;
}
