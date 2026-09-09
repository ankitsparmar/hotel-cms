import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OTAChannelName } from '../../../common/enums';
import { Property } from '../../properties/entities/property.entity';

// One row per OTA connection a property owner has configured for their own
// property. Booking.com is the only adapter implemented (§11), but this is
// modelled per-channel-per-property from the start (§12) so a property can
// later add Airbnb/Expedia, or so the platform can host many properties
// each with their own independent Booking.com credentials.
@Entity('ota_channels')
@Index(['propertyId', 'name'], { unique: true })
export class OTAChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column({ type: 'enum', enum: OTAChannelName, default: OTAChannelName.BOOKING_COM })
  name: OTAChannelName;

  // Encrypted JSON blob (AES-256-GCM, see crypto.util.ts) holding whatever
  // the adapter needs — for Booking.com: hotel_id + JWT machine-account
  // credentials. Never returned to the client in plaintext.
  @Column({ type: 'text', nullable: true })
  encryptedCredentials?: string;

  @Column({ default: false })
  syncEnabled: boolean;

  // When true (and/or no real credentials are configured), the adapter
  // simulates incoming reservations instead of calling Booking.com, so the
  // full pipeline (poll -> map -> create reservation -> sync log) is
  // demonstrable without live Connectivity Partner access (§11's access
  // gate is explained to the user in the UI).
  @Column({ default: true })
  demoMode: boolean;

  @Column({ default: 15 })
  pollIntervalMinutes: number;

  // Manually maintained OTA room/rate id -> internal RoomType id mapping.
  @Column('jsonb', { default: {} })
  roomTypeMapping: Record<string, string>;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
