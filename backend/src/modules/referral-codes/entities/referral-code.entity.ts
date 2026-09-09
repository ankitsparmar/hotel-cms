import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Signup is referral-gated: a property can only be created by redeeming an
// unused, unrevoked code. Only a platform super admin can mint these (see
// PlatformService.createReferralCode) — enforced by @Roles(SUPER_ADMIN) on
// the controller, the same lockdown pattern as the SUPER_ADMIN role itself.
@Entity('referral_codes')
export class ReferralCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  note?: string;

  @Column('uuid')
  createdByUserId: string;

  // Single-use: set atomically at signup time inside a transaction with a
  // row lock, so two concurrent signups can't both redeem the same code.
  @Column('uuid', { nullable: true })
  usedByPropertyId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date | null;

  // Lets a super admin invalidate an unused code without deleting the row
  // (keeps an audit trail).
  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
