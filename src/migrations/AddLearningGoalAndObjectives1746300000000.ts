import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLearningGoalAndObjectives1746300000000 implements MigrationInterface {
  name = 'AddLearningGoalAndObjectives1746300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS learning_goal varchar(500)
    `);
    await queryRunner.query(`
      ALTER TABLE tutor_courses
      ADD COLUMN IF NOT EXISTS objectives varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tutor_courses DROP COLUMN IF EXISTS objectives`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN IF EXISTS learning_goal`);
  }
}
