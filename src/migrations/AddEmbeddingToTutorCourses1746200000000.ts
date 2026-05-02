import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingToTutorCourses1746200000000 implements MigrationInterface {
  name = 'AddEmbeddingToTutorCourses1746200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tutor_courses
      ADD COLUMN IF NOT EXISTS embedding vector(1024)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tutor_courses_embedding"
      ON tutor_courses USING hnsw (embedding vector_cosine_ops)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tutor_courses_embedding"`);
    await queryRunner.query(`ALTER TABLE tutor_courses DROP COLUMN IF EXISTS embedding`);
  }
}
