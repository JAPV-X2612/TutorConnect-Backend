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
 * the AI-matching engine (MOD-BUS-003) uses them to rank tutors for a given learner.
 *
 * @author TutorConnect Team
 */
@Entity('tutor_topic')
export class TutorTopicEntity {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;

  @OneToMany(() => LearnerPreferenceEntity, (pref) => pref.topic)
  learnerPreferences: LearnerPreferenceEntity[];
}
