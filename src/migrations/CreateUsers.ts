import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1744371000000 implements MigrationInterface {
  name = 'CreateUsers1744371000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TYPE "public"."users_rol_enum" AS ENUM('APRENDIZ', 'TUTOR')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clerk_id" character varying(255) NOT NULL,
        "email" character varying(150) NOT NULL,
        "rol" "public"."users_rol_enum" NOT NULL DEFAULT 'APRENDIZ',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_clerk_id" ON "users" ("clerk_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_clerk_id"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_rol_enum"`);
  }
}