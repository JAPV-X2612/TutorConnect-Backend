import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Captures a point-in-time snapshot of the applicable tax rate for a given
 * country and county/state.
 *
 * Snapshots are immutable once created; changes to tax rates produce new
 * records rather than updates to existing ones, preserving an accurate
 * audit trail for each transaction period.
 *
 * @author TutorConnect Team
 */
@Entity('tax_snapshot')
export class TaxSnapshotEntity {
  /**
   * Surrogate primary key — bigint identity column.
   */
  @PrimaryGeneratedColumn('identity')
  id: number;

  /**
   * ISO 3166-1 country name or code to which this tax rate applies
   * (e.g. "Colombia", "United States").
   */
  @Column({ name: 'country_name', type: 'varchar', length: 100 })
  countryName: string;

  /**
   * Sub-national division (state, province, or county) to which this rate
   * applies. Null when the rate is country-wide.
   */
  @Column({ name: 'county_name', type: 'varchar', length: 100, nullable: true })
  countyName: string | null;

  /**
   * Fractional tax rate (e.g. 0.19 = 19 % Colombian IVA).
   */
  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 4 })
  taxRate: number;

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
}
