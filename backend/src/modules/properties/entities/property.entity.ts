import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ default: 'Europe/London' })
  timezone: string;

  @Column({ default: 'GBP' })
  currency: string;

  // Set by a platform super admin. Suspended properties' users cannot log in.
  @Column({ default: false })
  suspended: boolean;

  @OneToMany(() => User, (u) => u.property)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
