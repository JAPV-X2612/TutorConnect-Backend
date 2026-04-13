import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { LearnerPreferenceEntity } from '../../users/entities/learner-preference.entity';

/**
 * Represents a subject-area topic that a tutor offers on TutorConnect.
 *
 * Topics serve as the bridge between tutor expertise and learner preferences;
 * the AI-matching engine (MOD-BUS-003) uses them to rank tutors for a given
 * learner.
 *
 * @author TutorConnect Team
 */
@Entity('tutor_topic')
export class TutorTopicEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Human-readable name of the topic (e.g. "Calculus", "English Conversation").
   */
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

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
   * The tutor (user with role TUTOR) who offers this topic.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;

  /**
   * Learner preferences that reference this topic.
   */
  @OneToMany(() => LearnerPreferenceEntity, (pref) => pref.topic)
  learnerPreferences: LearnerPreferenceEntity[];
}
