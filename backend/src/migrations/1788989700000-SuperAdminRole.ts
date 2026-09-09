import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds platform-wide support: a SUPER_ADMIN user has no property (propertyId
// must become nullable), and a property can be suspended by one.
export class SuperAdminRole1788989700000 implements MigrationInterface {
  name = 'SuperAdminRole1788989700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres enum types aren't altered by TypeORM when the TS enum grows —
    // the DB-level enum needs its own ADD VALUE. Safe inside a transaction on
    // PG12+ as long as the new value isn't used until the transaction commits.
    await queryRunner.query(`ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "propertyId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN "suspended" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE for enum types, so 'super_admin' stays in
    // users_role_enum on rollback — harmless if unused.
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN "suspended"`);
    await queryRunner.query(`DELETE FROM "users" WHERE "propertyId" IS NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "propertyId" SET NOT NULL`);
  }
}
