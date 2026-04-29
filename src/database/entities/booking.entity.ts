import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { TutorEntity } from './tutor.entity';
import { TutorCourseEntity } from '../../modules/tutors/entities/tutor-course.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: UserEntity;

  @ManyToOne(() => TutorEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: TutorEntity;

  @ManyToOne(() => TutorCourseEntity, {
    onDelete: 'SET NULL',
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: 'course_id' })
  course: TutorCourseEntity | null;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime?: Date;

  @Column({ length: 20, default: 'pending' })
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  @Column({ type: 'varchar', length: 150, nullable: true })
  subject: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
