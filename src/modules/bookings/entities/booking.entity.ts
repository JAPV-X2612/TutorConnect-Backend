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
import { BookingStatus } from '../../../common/enums/booking-status.enum';

/**
 * Represents a tutoring session request between a learner and a tutor.
 *
 * Business rules enforced at the service layer:
 * - A booking may only be created if the tutor has a matching availability slot
 *   for the requested {@link scheduledAt} and {@link durationMinutes}.
 * - When the status transitions to {@link BookingStatus.CONFIRMED} a chat channel
 *   is automatically created (MOD-MSG-005).
 * - Transitions to {@link BookingStatus.CANCELLED_BY_LEARNER},
 *   {@link BookingStatus.CANCELLED_BY_TUTOR}, or {@link BookingStatus.EXPIRED}
 *   put the associated chat channel into read-only mode.
 *
 * @author TutorConnect Team
 */
@Entity('booking')
export class BookingEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Duration of the requested session in minutes.
   */
  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes: number;

  /**
   * UTC timestamp at which the session is scheduled to begin.
   */
  @Column({ name: 'scheduled_at', type: 'timestamp with time zone' })
  scheduledAt: Date;

  /**
   * Optional reason provided when a booking is cancelled or rejected.
   */
  @Column({
    name: 'cancellation_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  cancellationReason: string | null;

  /**
   * Current lifecycle status of the booking.
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.PENDING_CONFIRMATION,
  })
  status: BookingStatus;

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
   * The learner (user with role LEARNER) who requested this booking.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  /**
   * The tutor (user with role TUTOR) who will deliver the session.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
