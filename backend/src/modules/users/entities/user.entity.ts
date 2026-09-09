import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../../common/enums';
import { Property } from '../../properties/entities/property.entity';

@Entity('users')
@Index(['propertyId', 'email'], { unique: true })
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

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
