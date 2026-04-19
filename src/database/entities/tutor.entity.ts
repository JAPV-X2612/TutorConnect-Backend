import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CertificacionEntity } from './certificacion.entity';
import { TutorEstado } from '../../common/enums/tutor-estado.enum';

@Entity('tutors')
export class TutorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: UserEntity;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100 })
  apellido!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  descripcion?: string;

  @Column({
    type: 'enum',
    enum: TutorEstado,
    enumName: 'tutor_estado_enum',
    default: TutorEstado.PENDIENTE,
  })
  estado!: TutorEstado;

  @OneToMany(() => CertificacionEntity, (cert) => cert.tutor)
  certificaciones!: CertificacionEntity[];

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'simple-array', nullable: true })
  subjects?: string[];

  @Column({ type: 'float', nullable: true })
  rating?: number;

  @Column({ type: 'int', nullable: true })
  experienceYears?: number;

  @Column({ type: 'float', nullable: true, name: 'precio_hora' })
  precioHora?: number;

  @Column({ type: 'boolean', default: false })
  disponible!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
