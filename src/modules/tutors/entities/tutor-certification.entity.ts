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
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Publicly accessible URL of the certification file (e.g. an S3 pre-signed URL).
   */
  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  /**
   * MIME / format of the uploaded file.
   */
  @Column({
    name: 'file_type',
    type: 'enum',
    enum: CertificationFileType,
    enumName: 'certification_file_type',
  })
  fileType: CertificationFileType;

  /**
   * Short title describing the expertise area covered by this certification
   * (e.g. "Advanced Mathematics", "TEFL Certificate").
   */
  @Column({ name: 'area_title', type: 'varchar', length: 200 })
  areaTitle: string;

  /**
   * Timestamp at which this certification was cancelled by the platform.
   * Null while the certification is valid.
   */
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  /**
   * Timestamp of record creation — managed automatically by TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Soft-delete timestamp. Null while the record is active.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ────────────────────────────────────────────────────────────────

  /**
   * The tutor (user with role TUTOR) who uploaded this certification.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'tutor_id' })
  tutor: UserEntity;
}
