import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TutorEntity } from '../../../database/entities/tutor.entity';

@Entity('tutor_courses')
export class TutorCourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TutorEntity, (tutor) => tutor.courses, { onDelete: 'CASCADE' })
  tutor: TutorEntity;

  @Column({ type: 'varchar', length: 100 })
  subject: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'int', default: 60 })
  duration: number;

  @Column({ type: 'varchar', length: 50 })
  modalidad: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  academicLevel?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
