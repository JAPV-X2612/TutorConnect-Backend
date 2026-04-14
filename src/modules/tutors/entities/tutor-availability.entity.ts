import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { DayOfWeek } from '../../../common/enums/day-of-week.enum';

/**
 * Defines a recurring weekly availability slot for a tutor.
 *
 * Business rule: a booking may only be created if the tutor has an availability
 * slot matching the requested {@code scheduled_at} and {@code duration_minutes}
 * (see CLAUDE.md §Domain-Specific Business Rules, rule 1).
 *
 * @author TutorConnect Team
 */
@Entity('tutor_availability')
export class TutorAvailabilityEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Day of the week on which this availability slot applies.
   */
  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
    enumName: 'day_of_week',
  })
  dayOfWeek: DayOfWeek;

  /**
   * Wall-clock time at which this slot begins (e.g. "09:00:00").
   */
  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  /**
   * Wall-clock time at which this slot ends (e.g. "11:00:00").
   */
  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

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
   * The tutor (user with role TUTOR) to whom this slot belongs.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
