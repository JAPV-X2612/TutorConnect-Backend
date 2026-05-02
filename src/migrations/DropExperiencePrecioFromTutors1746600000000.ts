import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropExperiencePrecioFromTutors1746600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tutors DROP COLUMN IF EXISTS "experienceYears"`);
    await queryRunner.query(`ALTER TABLE tutors DROP COLUMN IF EXISTS precio_hora`);
    await queryRunner.query(`ALTER TABLE tutor_courses ADD COLUMN IF NOT EXISTS "experienceYears" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tutor_courses DROP COLUMN IF EXISTS "experienceYears"`);
    await queryRunner.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS "experienceYears" integer`);
    await queryRunner.query(`ALTER TABLE tutors ADD COLUMN IF NOT EXISTS precio_hora float`);
  }
}
