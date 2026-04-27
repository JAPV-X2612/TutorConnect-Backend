import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CertificacionEntity } from './certificacion.entity';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';
import { TutorCourseEntity } from '../../modules/tutors/entities/tutor-course.entity';

@Entity('tutors')
export class TutorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'clerk_id', type: 'varchar', unique: true })
  clerkId: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'varchar', length: 100 })
  apellido!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cedula?: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({
    type: 'enum',
    enum: EstadoTutor,
    enumName: 'estado_tutor_enum',
    default: EstadoTutor.PENDIENTE,
  })
  estado: EstadoTutor;

  @OneToMany(() => CertificacionEntity, (cert) => cert.tutor)
  certificaciones!: CertificacionEntity[];

  @OneToMany(() => TutorCourseEntity, (course) => course.tutor)
  courses!: TutorCourseEntity[];

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
