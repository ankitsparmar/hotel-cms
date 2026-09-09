import { MigrationInterface, QueryRunner } from 'typeorm';

// §7 acceptance criterion: "Overlapping rate plans for the same room type
// and date range are rejected at creation, not silently resolved by
// priority." Same GiST-exclusion technique as the booking constraint.
export class RatePlanOverlapConstraint1788986600001 implements MigrationInterface {
  name = 'RatePlanOverlapConstraint1788986600001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rate_plans"
      ADD COLUMN "validRange" daterange
      GENERATED ALWAYS AS (daterange("validFrom", "validTo", '[]')) STORED
    `);

    await queryRunner.query(`
      ALTER TABLE "rate_plans"
      ADD CONSTRAINT "no_overlapping_rate_plans"
      EXCLUDE USING gist ("roomTypeId" WITH =, "validRange" WITH &&)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rate_plans" DROP CONSTRAINT "no_overlapping_rate_plans"`);
    await queryRunner.query(`ALTER TABLE "rate_plans" DROP COLUMN "validRange"`);
  }
}
