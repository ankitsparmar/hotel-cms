// §12: every OTA integration goes through this interface so the sync
// pipeline (ota-sync.processor.ts -> ReservationsService.createFromOta)
// never touches an OTA's specific wire format or terminology directly.
// Adding Airbnb/Expedia later, or upgrading an existing channel to
// two-way sync, means writing a new adapter — not touching the pipeline.
export interface RawOtaReservation {
  externalRef: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  otaRoomId: string; // the OTA's own room/rate identifier — mapped to an
  // internal RoomType via OTAChannel.roomTypeMapping, never used directly
  paymentCollectedByOta: boolean;
  rawPayloadRef?: string;
}

export interface ChannelAdapter {
  /** Pull new/modified reservations since the last successful poll. */
  pullReservations(): Promise<RawOtaReservation[]>;

  /**
   * Push updated rates/availability out to the channel. Not implemented by
   * any adapter in v1 (spec §12: "don't build pushAvailability()
   * speculatively") — the method is stubbed so the interface shape is
   * ready the day a channel grants push access.
   */
  pushAvailability?(): Promise<void>;
}
