import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_users_clerk_id', { unique: true })
  @Column({ name: 'clerk_id', type: 'varchar', length: 255 })
  clerkId: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({
    name: 'rol',
    type: 'enum',
    enum: Role,
    enumName: 'users_rol_enum',
    default: Role.APRENDIZ,
  })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Compatibility fields used by existing DTOs/services.
  name?: string;
  updatedAt?: Date;
}