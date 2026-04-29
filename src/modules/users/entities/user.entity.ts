import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { LearnerPreferenceEntity } from './learner-preference.entity';

/**
 * Represents a TutorConnect platform user.
 *
 * A user may hold either the TUTOR or LEARNER role. Authentication is delegated
 * to Clerk; the {@link clerkId} field is the authoritative external identifier.
 *
 * @author TutorConnect Team
 */
@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Index('IDX_user_clerk_id', { unique: true })
  @Column({ name: 'clerk_id', type: 'varchar', length: 255, unique: true })
  clerkId: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.LEARNER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'city', type: 'varchar', length: 150, nullable: true })
  city?: string | null;

  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    default: 'Colombia',
  })
  country?: string;

  @Column({
    name: 'organization_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  organizationName?: string | null;

  @Column({
    name: 'academic_program',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  academicProgram?: string | null;

  // Learner-only fields

  @Column({ name: 'interests', type: 'jsonb', nullable: true })
  interests?: string[] | null;

  @Column({ name: 'current_semester', type: 'int', nullable: true })
  currentSemester?: number | null;

  // Tutor-only fields

  @Column({ name: 'specialties', type: 'jsonb', nullable: true })
  specialties?: string[] | null;

  @Column({ name: 'experience_years', type: 'int', nullable: true })
  experienceYears?: number | null;

  @Column({ name: 'is_verified', type: 'boolean', nullable: true })
  isVerified?: boolean | null;

  @Column({ name: 'hourly_rate', type: 'float', nullable: true })
  hourlyRate?: number | null;

  // Relations

  @OneToMany(() => LearnerPreferenceEntity, (pref) => pref.learner)
  learnerPreferences: LearnerPreferenceEntity[];
}
