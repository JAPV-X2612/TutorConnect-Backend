import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { MessageEntity } from './message.entity';

/**
 * Represents a persistent bidirectional chat channel between a learner and a
 * tutor, scoped to a confirmed booking.
 *
 * Business rules (enforced at the service layer):
 * - Channels are created automatically when a booking transitions to
 *   {@code BookingStatus.CONFIRMED}.
 * - Channels become read-only when the associated booking transitions to
 *   {@code CANCELLED_BY_LEARNER}, {@code CANCELLED_BY_TUTOR}, or
 *   {@code EXPIRED}.
 * - Only learners may initiate a new channel; the backend enforces this
 *   regardless of client input.
 *
 * @author TutorConnect Team
 */
@Entity('chat_channel')
export class ChatChannelEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

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
   * The confirmed booking that originated this channel.
   */
  @OneToOne(() => BookingEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  /**
   * The tutor participant (user with role TUTOR).
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;

  /**
   * The learner participant (user with role LEARNER).
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  /**
   * All messages exchanged in this channel.
   */
  @OneToMany(() => MessageEntity, (message) => message.channel)
  messages: MessageEntity[];
}
