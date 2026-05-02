import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

/**
 * Serialized representation of a user returned in API responses.
 *
 * @author TutorConnect Team
 */
export class UserDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ example: 'user_2abc123' })
  @Expose()
  clerkId: string;

  @ApiProperty({ example: 'maria@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'María' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'López' })
  @Expose()
  lastName: string;

  @ApiProperty({ example: UserRole.LEARNER, enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ example: UserStatus.ACTIVE, enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiProperty({ example: '2026-04-18T18:05:02.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-04-18T18:05:02.000Z' })
  @Expose()
  updatedAt: Date;

  // ── Location & institutional ─────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'BOGOTÁ' })
  @Expose()
  city?: string | null;

  @ApiPropertyOptional({ example: 'Colombia' })
  @Expose()
  country?: string;

  @ApiPropertyOptional({ example: 'ESCUELA COLOMBIANA DE INGENIERÍA' })
  @Expose()
  organizationName?: string | null;

  @ApiPropertyOptional({ example: 'Ingeniería de Sistemas' })
  @Expose()
  academicProgram?: string | null;

  // ── Learner-specific ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: ['Matemáticas', 'Física'] })
  @Expose()
  interests?: string[] | null;

  @ApiPropertyOptional({ example: 'Quiero aprender cálculo para ingeniería' })
  @Expose()
  learningGoal?: string | null;

  @ApiPropertyOptional({ example: 'universitario' })
  @Expose()
  studentType?: string | null;

  @ApiPropertyOptional({ example: 4 })
  @Expose()
  currentSemester?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @Expose()
  schoolGrade?: number | null;
}
