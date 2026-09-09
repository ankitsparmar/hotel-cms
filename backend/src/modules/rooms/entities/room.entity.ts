import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RoomStatus } from '../../../common/enums';
import { Property } from '../../properties/entities/property.entity';
import { RoomType } from '../../room-types/entities/room-type.entity';

@Entity('rooms')
@Index(['propertyId', 'roomNumber'], { unique: true })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column()
  roomTypeId: string;

  @ManyToOne(() => RoomType, (rt) => rt.rooms)
  @JoinColumn({ name: 'roomTypeId' })
  roomType: RoomType;

  @Column()
  roomNumber: string;

  @Column({ nullable: true })
  floor?: string;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.CLEAN })
  status: RoomStatus;

  @Column({ nullable: true, type: 'text' })
  outOfOrderReason?: string;

  @Column({ default: false })
  archived: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
