import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePgvector1746100000000 implements MigrationInterface {
  name = 'EnablePgvector1746100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`);
  }
}
