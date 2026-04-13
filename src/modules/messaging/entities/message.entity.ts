import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChatChannelEntity } from './chat-channel.entity';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * Represents a single message persisted within a {@link ChatChannelEntity}.
 *
 * PostgreSQL is the source of truth for message persistence. Active connections
 * are tracked in Redis and broadcast via Redis Pub/Sub to support horizontal
 * scaling (see CLAUDE.md §Real-Time & Concurrency).
 *
 * @author TutorConnect Team
 */
@Entity('message')
export class MessageEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Plain-text body of the message.
   */
  @Column({ name: 'content', type: 'text' })
  content: string;

  /**
   * UTC timestamp at which the message was sent by the client.
   */
  @Column({ name: 'sent_at', type: 'timestamp with time zone' })
  sentAt: Date;

  /**
   * Timestamp of record creation — managed automatically by TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Soft-delete timestamp. Null while the record is active.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ────────────────────────────────────────────────────────────────

  /**
   * The chat channel this message belongs to.
   */
  @ManyToOne(() => ChatChannelEntity, (channel) => channel.messages, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'channel_id' })
  channel: ChatChannelEntity;

  /**
   * The user (learner or tutor) who authored this message.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'sender_id' })
  sender: UserEntity;
}
