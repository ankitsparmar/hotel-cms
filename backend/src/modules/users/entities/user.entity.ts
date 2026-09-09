import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../../common/enums';
import { Property } from '../../properties/entities/property.entity';

@Entity('users')
@Index(['propertyId', 'email'], { unique: true })
@Index(['propertyId', 'username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Null only for SUPER_ADMIN — every property-scoped role must have one.
  @Column('uuid', { nullable: true })
  propertyId: string | null;

  @ManyToOne(() => Property, (p) => p.users, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Column()
  name: string;

  @Column()
  email: string;

  // Alternate sign-in identifier alongside email. Nullable at the DB level
  // for pre-existing rows, but every row created going forward always gets
  // one (auto-generated from the email's local part when not chosen), so in
  // practice this is never null after AuthService.signup/UsersService.create.
  @Column({ nullable: true })
  username: string | null;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @Column({ default: false })
  emailVerified: boolean;

  // Hashed (never the raw token — the raw value only ever exists in the
  // emailed link) verification/reset tokens, cleared once consumed.
  @Column({ nullable: true })
  emailVerificationTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires: Date | null;

  @Column({ nullable: true })
  passwordResetTokenHash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
