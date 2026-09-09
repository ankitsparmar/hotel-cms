import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RoomStatus } from '../../../common/enums';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('room_status_logs')
export class RoomStatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'enum', enum: RoomStatus })
  status: RoomStatus;

  @Column({ nullable: true })
  changedBy?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'changedBy' })
  changedByUser?: User;

  @Column({ nullable: true, type: 'text' })
  reason?: string;

  @Column({ default: false })
  wasOverride: boolean;

  @CreateDateColumn()
  changedAt: Date;
}
