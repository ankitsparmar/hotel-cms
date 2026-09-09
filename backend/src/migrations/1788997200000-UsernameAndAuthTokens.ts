import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds username-based sign-in plus the token/expiry columns backing
// forgot-password and email-verification. Existing rows get a username
// backfilled from their email's local part (deduped within their own
// property/super-admin scope) so the column can carry a unique index
// without breaking data that predates this feature — every row created
// from here on always gets one via AuthService.signup / UsersService.create.
export class UsernameAndAuthTokens1788997200000 implements MigrationInterface {
  name = 'UsernameAndAuthTokens1788997200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "username" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerificationTokenHash" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "emailVerificationExpires" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "passwordResetTokenHash" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "passwordResetExpires" TIMESTAMP`);

    const users: { id: string; propertyId: string | null; email: string }[] = await queryRunner.query(
      `SELECT "id", "propertyId", "email" FROM "users" ORDER BY "createdAt" ASC`,
    );
    const takenByScope = new Map<string, Set<string>>();
    for (const u of users) {
      const scopeKey = u.propertyId ?? '__super_admin__';
      const taken = takenByScope.get(scopeKey) ?? new Set<string>();
      const base = (u.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.-]/g, '') || 'user';
      let candidate = base;
      let n = 1;
      while (taken.has(candidate)) {
        n += 1;
        candidate = `${base}${n}`;
      }
      taken.add(candidate);
      takenByScope.set(scopeKey, taken);
      await queryRunner.query(`UPDATE "users" SET "username" = $1 WHERE "id" = $2`, [candidate, u.id]);
    }

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_propertyId_username" ON "users" ("propertyId", "username")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_propertyId_username"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetExpires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordResetTokenHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationExpires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerificationTokenHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerified"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
  }
}
