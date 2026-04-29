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
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: DayOfWeek,
    enumName: 'day_of_week',
  })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
