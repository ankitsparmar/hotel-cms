import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OTASyncStatus } from '../../../common/enums';
import { OTAChannel } from './ota-channel.entity';

@Entity('ota_sync_logs')
export class OTASyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  channelId: string;

  @ManyToOne(() => OTAChannel)
  @JoinColumn({ name: 'channelId' })
  channel: OTAChannel;

  @Column({ type: 'enum', enum: OTASyncStatus })
  status: OTASyncStatus;

  @Column({ default: 0 })
  reservationsPulled: number;

  @Column('jsonb', { default: [] })
  errors: string[];

  @CreateDateColumn()
  runAt: Date;
}
