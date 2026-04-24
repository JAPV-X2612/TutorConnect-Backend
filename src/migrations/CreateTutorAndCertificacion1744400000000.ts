import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTutorAndCertificacion1744400000000 implements MigrationInterface {
  name = 'CreateTutorAndCertificacion1744400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."estado_tutor_enum" AS ENUM('PENDIENTE', 'VERIFICADO', 'RECHAZADO')
    `);
    await queryRunner.query(`
      CREATE TABLE "tutors" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "clerk_id"         character varying NOT NULL,
        "email"            character varying NOT NULL,
        "nombre"           character varying NOT NULL,
        "apellido"         character varying NOT NULL,
        "descripcion"      text,
        "estado"           "public"."estado_tutor_enum" NOT NULL DEFAULT 'PENDIENTE',
        "bio"              text,
        "subjects"         text,
        "rating"           double precision,
        "experience_years" integer,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_tutors_clerk_id" UNIQUE ("clerk_id"),
        CONSTRAINT "UQ_tutors_email"    UNIQUE ("email"),
        CONSTRAINT "PK_tutors_id"       PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tutors_clerk_id" ON "tutors" ("clerk_id")
    `);
    await queryRunner.query(`
      CREATE TABLE "certificaciones" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tutor_id"       uuid NOT NULL,
        "nombre_archivo" character varying(255) NOT NULL,
        "s3_key"         character varying(500) NOT NULL,
        "s3_url"         character varying(1000) NOT NULL,
        "mime_type"      character varying(100) NOT NULL,
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_certificaciones_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificaciones_tutor"
          FOREIGN KEY ("tutor_id") REFERENCES "tutors"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "certificaciones"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tutors_clerk_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tutors"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."estado_tutor_enum"`);
  }
}
