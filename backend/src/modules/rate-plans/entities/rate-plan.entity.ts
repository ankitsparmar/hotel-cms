import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RoomType } from '../../room-types/entities/room-type.entity';

@Entity('rate_plans')
export class RatePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  propertyId: string;

  @Column()
  roomTypeId: string;

  @ManyToOne(() => RoomType)
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @Column()
  name: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price: string;

  @Column('date')
  validFrom: string;

  @Column('date')
  validTo: string;

  @Column('jsonb', { default: {} })
  restrictions: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
