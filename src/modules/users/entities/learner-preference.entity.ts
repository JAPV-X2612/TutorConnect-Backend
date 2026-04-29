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
 * A learner may register an interest in one or more {@link TutorTopicEntity} topics.
 * These preferences feed the AI-powered tutor-matching engine.
 *
 * @author TutorConnect Team
 */
@Entity('learner_preference')
export class LearnerPreferenceEntity {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => UserEntity, (user) => user.learnerPreferences, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;

  @ManyToOne(() => TutorTopicEntity, (topic) => topic.learnerPreferences, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'topic_id' })
  topic: TutorTopicEntity;
}
