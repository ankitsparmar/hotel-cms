import { MigrationInterface, QueryRunner } from 'typeorm';

// Referral-gated signup: a property can only be created by redeeming an
// unused, unrevoked code minted by a super admin (see ReferralCode entity /
// PlatformService.createReferralCode).
export class ReferralCodes1788992800000 implements MigrationInterface {
  name = 'ReferralCodes1788992800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "referral_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying NOT NULL,
        "note" character varying,
        "createdByUserId" uuid NOT NULL,
        "usedByPropertyId" uuid,
        "usedAt" TIMESTAMP,
        "revoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_referral_codes_code" UNIQUE ("code"),
        CONSTRAINT "PK_referral_codes" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "referral_codes"`);
  }
}
