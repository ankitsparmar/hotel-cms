import { MigrationInterface, QueryRunner } from 'typeorm';

// Enforces spec §6's concurrency requirement at the database level: two
// simultaneous booking attempts for the same room can never both succeed.
// A GENERATED daterange column + a GiST EXCLUDE constraint means Postgres
// itself rejects the second overlapping INSERT/UPDATE with a serialization
// error - the API layer (reservations.service.ts) just needs to catch that
// error and turn it into a clean 409, it is not what provides the guarantee.
export class DoubleBookingExclusionConstraint1788986600000 implements MigrationInterface {
  name = 'DoubleBookingExclusionConstraint1788986600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`
      ALTER TABLE "reservation_rooms"
      ADD COLUMN "stay" daterange
      GENERATED ALWAYS AS (daterange("checkIn", "checkOut", '[)')) STORED
    `);

    // Only rows still occupying the room (active = true) participate in the
    // exclusion check; checked_out/cancelled/no_show bookings flip active
    // to false (see reservations.service.ts) and drop out of it.
    await queryRunner.query(`
      ALTER TABLE "reservation_rooms"
      ADD CONSTRAINT "no_double_booking"
      EXCLUDE USING gist ("roomId" WITH =, "stay" WITH &&)
      WHERE ("active" = true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reservation_rooms" DROP CONSTRAINT "no_double_booking"`);
    await queryRunner.query(`ALTER TABLE "reservation_rooms" DROP COLUMN "stay"`);
  }
}
