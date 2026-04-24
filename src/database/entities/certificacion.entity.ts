import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { TutorEntity } from './tutor.entity';

@Entity('certificaciones')
export class CertificacionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TutorEntity, (tutor) => tutor.certificaciones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_id' })
  tutor: TutorEntity;

  @Column({ name: 'nombre_archivo', type: 'varchar', length: 255 })
  nombreArchivo: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500 })
  s3Key: string;

  @Column({ name: 's3_url', type: 'varchar', length: 1000 })
  s3Url: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
