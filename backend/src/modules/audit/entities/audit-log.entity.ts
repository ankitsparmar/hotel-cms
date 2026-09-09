import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Generalised audit trail per §2.1 / §14 — used for Owner/Admin actions
// against users and listings, and can be extended to any sensitive action.
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  propertyId: string;

  @Column('uuid')
  actorId: string;

  @Column()
  action: string;

  @Column()
  targetType: string;

  @Column('uuid', { nullable: true })
  targetId?: string;

  @Column('jsonb', { default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
