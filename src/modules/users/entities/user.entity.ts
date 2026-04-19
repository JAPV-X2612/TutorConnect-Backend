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
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * External identifier issued by Clerk. Must be unique across all users.
   */
  @Index('IDX_user_clerk_id', { unique: true })
  @Column({ name: 'clerk_id', type: 'varchar', length: 255, unique: true })
  clerkId: string;

  /**
   * User's primary email address, synced from Clerk.
   */
  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email: string;

  /**
   * User's given name.
   */
  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  /**
   * User's family name.
   */
  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  /**
   * Current account status.
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  /**
   * Platform role that determines access permissions.
   */
  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.LEARNER,
  })
  role: UserRole;

  /**
   * Timestamp of record creation — managed automatically by TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp of the most recent update — managed automatically by TypeORM.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Soft-delete timestamp. Null while the record is active.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ────────────────────────────────────────────────────────────────

  /**
   * Topic preferences registered by this learner.
   * Only populated when role is {@link UserRole.LEARNER}.
   */
  @OneToMany(() => LearnerPreferenceEntity, (pref) => pref.learner)
  learnerPreferences: LearnerPreferenceEntity[];
}
