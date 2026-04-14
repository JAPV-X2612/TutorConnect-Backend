import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TutorTopicEntity } from '../../tutors/entities/tutor-topic.entity';

/**
 * Records the subject-area preferences of a learner.
 *
 * A learner may register an interest in one or more {@link TutorTopicEntity}
 * topics. These preferences feed the AI-powered tutor-matching engine
 * (MOD-BUS-003).
 *
 * @author TutorConnect Team
 */
@Entity('learner_preference')
export class LearnerPreferenceEntity {
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
   * The learner who holds this preference.
   */
  @ManyToOne(() => UserEntity, (user) => user.learnerPreferences, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  /**
   * The topic the learner is interested in.
   */
  @ManyToOne(() => TutorTopicEntity, (topic) => topic.learnerPreferences, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'topic_id' })
  topic: TutorTopicEntity;
}
