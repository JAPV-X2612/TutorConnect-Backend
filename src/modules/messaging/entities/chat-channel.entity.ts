import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { TutorCourseEntity } from '../../tutors/entities/tutor-course.entity';
import { MessageEntity } from './message.entity';

/**
 * Persistent bidirectional chat channel between a learner and a tutor.
 *
 * Pre-booking channels (no confirmed booking yet) carry an `expiresAt`
 * timestamp 24 hours after creation. Once a booking is confirmed the
 * expiry is cleared and the channel remains open indefinitely.
 *
 * @author TutorConnect Team
 */
@Entity('chat_channel')
@Index(['tutor', 'learner'], { unique: true })
export class ChatChannelEntity {
  @PrimaryGeneratedColumn('identity')
  id: number;

  /** False when the channel has been closed due to cancellation or admin action. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Expiry for pre-booking channels (24 h from creation).
   * Null once a booking is confirmed — channel is then permanent.
   */
  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ────────────────────────────────────────────────────────────────

  /** Course the conversation is about — set on creation and never changed. */
  @ManyToOne(() => TutorCourseEntity, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'course_id' })
  course: TutorCourseEntity | null;

  /** Originating booking — nullable so the channel survives booking deletion. */
  @OneToOne(() => BookingEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  @OneToMany(() => MessageEntity, (message) => message.channel)
  messages: MessageEntity[];
}
