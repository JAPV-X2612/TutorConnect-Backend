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
import { BookingEntity } from '../../bookings/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

/**
 * Records a financial transaction associated with a completed booking.
 *
 * Commission formula (enforced at the service layer):
 *   {@code commission_amount = amount × commission_rate}
 *
 * Both {@link commissionRate} and {@link commissionAmount} are stored at the
 * time of the transaction so that future changes to the platform rate do not
 * affect historical records.
 *
 * The payment lifecycle follows the SAGA pattern:
 *   PENDING → PROCESSING → COMPLETED | FAILED | CANCELLED
 *
 * @author TutorConnect Team
 */
@Entity('payment')
export class PaymentEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * Gross amount charged to the learner (in the platform's base currency).
   */
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  /**
   * Fractional commission rate applied by TutorConnect (e.g. 0.15 = 15 %).
   * Stored at transaction time to preserve historical accuracy.
   */
  @Column({ name: 'commission_rate', type: 'numeric', precision: 5, scale: 4 })
  commissionRate: number;

  /**
   * Absolute commission amount retained by TutorConnect.
   * Derived as {@code amount × commission_rate} and stored for audit purposes.
   */
  @Column({
    name: 'commission_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  commissionAmount: number;

  /**
   * Current status of this payment transaction.
   */
  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  /**
   * Timestamp of record creation — managed automatically by TypeORM.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp of the most recent update — managed automatically by TypeORM.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Soft-delete timestamp. Null while the record is active.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  // ── Relations ────────────────────────────────────────────────────────────────

  /**
   * The booking this payment is associated with.
   */
  @ManyToOne(() => BookingEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'booking_id' })
  booking: BookingEntity;

  /**
   * The learner (user with role LEARNER) who made the payment.
   */
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'learner_id' })
  learner: UserEntity;
}
