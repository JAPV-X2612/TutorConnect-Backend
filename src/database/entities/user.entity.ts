import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TutorEntity } from './tutor.entity';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clerk_id', length: 255, unique: true, nullable: true })
  clerkId: string | null;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 50 })
  role: Role;

  @OneToOne(() => TutorEntity, (tutor) => tutor.user)
  tutor?: TutorEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
