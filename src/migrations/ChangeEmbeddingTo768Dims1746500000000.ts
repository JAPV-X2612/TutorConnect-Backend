import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeEmbeddingTo768Dims1746500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop HNSW index before altering the column type.
    await queryRunner.query(
      `DROP INDEX IF EXISTS tutor_courses_embedding_hnsw_idx`,
    );

    // Swap the column to 768 dimensions (Gemini text-embedding-004).
    // Existing 1024-dim vectors are cleared; re-index via POST /search/index.
    await queryRunner.query(
      `ALTER TABLE tutor_courses DROP COLUMN IF EXISTS embedding`,
    );
    await queryRunner.query(
      `ALTER TABLE tutor_courses ADD COLUMN embedding vector(768)`,
    );

    // Recreate the HNSW index for cosine similarity.
    await queryRunner.query(
      `CREATE INDEX tutor_courses_embedding_hnsw_idx
         ON tutor_courses
         USING hnsw (embedding vector_cosine_ops)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS tutor_courses_embedding_hnsw_idx`,
    );
    await queryRunner.query(
      `ALTER TABLE tutor_courses DROP COLUMN IF EXISTS embedding`,
    );
    await queryRunner.query(
      `ALTER TABLE tutor_courses ADD COLUMN embedding vector(1024)`,
    );
    await queryRunner.query(
      `CREATE INDEX tutor_courses_embedding_hnsw_idx
         ON tutor_courses
         USING hnsw (embedding vector_cosine_ops)`,
    );
  }
}
