import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Records a learner's rating and optional comment for a completed session.
 *
 * Business rules (enforced at the service layer):
 * - A session may only be reviewed if its {@code booking_status} is
 *   {@code COMPLETED}.
 * - Only one review per booking per learner is allowed (enforced by the
 *   unique constraint on {@code (booking_id, learner_id)}).
 *
 * NPS formula (computed from reviews in the KPI module):
 *   NPS = % ratings(5) − % ratings(1 or 2) over the selected period.
 *
 * @author TutorConnect Team
 */
@Entity('review')
@Index('UQ_review_booking_learner', ['booking', 'learner'], { unique: true })
export class ReviewEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Integer rating on a 1–5 scale provided by the learner.
   * Used for NPS calculation (5 = promoter; 1 or 2 = detractor).
   */
  @Column({ name: 'rating', type: 'smallint' })
  rating: number;

  /**
   * Optional free-text comment accompanying the rating.
   */
  @Column({ name: 'comment', type: 'varchar', length: 1000, nullable: true })
  comment: string | null;

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
   * The completed booking being reviewed.
   */
  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  /**
   * The learner (user with role LEARNER) who submitted the review.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  /**
   * The tutor (user with role TUTOR) who is being reviewed.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
