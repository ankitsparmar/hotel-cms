import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Room } from '../../rooms/entities/room.entity';

@Entity('room_types')
export class RoomType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column()
  maxOccupancy: number;

  @Column('numeric', { precision: 10, scale: 2 })
  baseRate: string;

  @Column('jsonb', { default: [] })
  amenities: string[];

  @Column('jsonb', { default: [] })
  photos: string[];

  // OTA-side identifier this room type maps to, maintained manually by an
  // admin per §11 (OTA room/rate ids don't match automatically).
  @Column({ nullable: true })
  otaRoomId?: string;

  @Column({ default: false })
  archived: boolean;

  @OneToMany(() => Room, (r) => r.roomType)
  rooms: Room[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
