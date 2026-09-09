import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { HousekeepingTaskStatus, HousekeepingTaskType } from '../../../common/enums';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('housekeeping_tasks')
export class HousekeepingTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  propertyId: string;

  @Column('uuid')
  roomId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'enum', enum: HousekeepingTaskType, default: HousekeepingTaskType.CHECKOUT_CLEAN })
  type: HousekeepingTaskType;

  @Column('uuid', { nullable: true })
  assignedTo?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignee?: User;

  @Column({ type: 'enum', enum: HousekeepingTaskStatus, default: HousekeepingTaskStatus.PENDING })
  status: HousekeepingTaskStatus;

  @Column({ type: 'timestamptz', nullable: true })
  dueBy?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
