import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentTypeAndGrade1746400000000 implements MigrationInterface {
  name = 'AddStudentTypeAndGrade1746400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 'universitario' | 'colegial' | 'profesional' | 'otro'
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS student_type varchar(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS school_grade int
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS school_grade`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS student_type`);
  }
}
