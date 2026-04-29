import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { CertificationFileType } from '../../../common/enums/certification-file-type.enum';

/**
 * Stores a certification document uploaded by a tutor to verify expertise.
 *
 * Each certification is associated with an academic or professional area
 * ({@link areaTitle}) and may be cancelled by the platform if it is found
 * invalid, setting the {@link cancelledAt} timestamp.
 *
 * @author TutorConnect Team
 */
@Entity('tutor_certification')
export class TutorCertificationEntity {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({
    name: 'file_type',
    type: 'enum',
    enum: CertificationFileType,
    enumName: 'certification_file_type',
  })
  fileType: CertificationFileType;

  @Column({ name: 'area_title', type: 'varchar', length: 200 })
  areaTitle: string;

  // Set by the platform when a certification is revoked; null while valid
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
