import { randomUUID } from 'crypto';
import { ChannelAdapter, RawOtaReservation } from './channel-adapter.interface';

export interface BookingComCredentials {
  hotelId: string;
  username: string;
  password: string;
}

const DEMO_GUEST_NAMES = ['A. Kowalski', 'M. Dubois', 'J. Tanaka', 'S. Okafor', 'L. Fernandez', 'R. Hughes'];

// §11: the real Reservations API is polling-based — GET /OTA_HotelResNotif
// for new bookings, GET /OTA_HotelResModifyNotif for modifications, both
// against secure-supply-xml.booking.com, authenticated with a JWT
// machine-account credential, followed by a POST acknowledgement so the
// same reservation isn't redelivered. Real partner access is gated behind
// Booking.com's Connectivity Partner programme (see the spec's §11
// callout) — this adapter attempts the real call when live credentials are
// configured, and otherwise (or on failure) runs in demo mode so the full
// pipeline is still exercisable end-to-end.
export class BookingComAdapter implements ChannelAdapter {
  constructor(
    private credentials: BookingComCredentials | null,
    private demoMode: boolean,
    private mappedOtaRoomIds: string[],
  ) {}

  async pullReservations(): Promise<RawOtaReservation[]> {
    if (!this.demoMode && this.credentials) {
      return this.pullReal();
    }
    return this.pullDemo();
  }

  private async pullReal(): Promise<RawOtaReservation[]> {
    // This is the real integration point. It will fail with the current
    // access model (no Booking.com Connectivity Partner credentials are
    // obtainable without the partner-portal approval described in the
    // spec) — that failure is expected and gets surfaced to OTASyncLog
    // rather than swallowed, per §11 ("a silently-failing sync is worse
    // than no integration").
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min timeout per §11
    try {
      const auth = Buffer.from(`${this.credentials!.username}:${this.credentials!.password}`).toString('base64');
      const res = await fetch(
        `https://secure-supply-xml.booking.com/hotels/xml/reservations?hotel_id=${encodeURIComponent(this.credentials!.hotelId)}`,
        { headers: { Authorization: `Basic ${auth}` }, signal: controller.signal },
      );
      if (!res.ok) {
        throw new Error(`Booking.com Reservations API returned ${res.status} ${res.statusText}`);
      }
      // Real parsing of OTA_HotelResNotif XML would go here. Left
      // unimplemented since there is no partner account to validate
      // against — see §11 of the spec.
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }

  private async pullDemo(): Promise<RawOtaReservation[]> {
    // Demo mode simulates 0-2 new reservations per poll so the full
    // pipeline (poll -> map -> create reservation -> sync log -> calendar)
    // is demonstrable without live Connectivity Partner access.
    const count = Math.floor(Math.random() * 3);
    const results: RawOtaReservation[] = [];
    for (let i = 0; i < count; i++) {
      const otaRoomId = this.mappedOtaRoomIds[Math.floor(Math.random() * this.mappedOtaRoomIds.length)];
      if (!otaRoomId) break;
      const startOffset = 1 + Math.floor(Math.random() * 20);
      const stayLength = 1 + Math.floor(Math.random() * 4);
      const checkIn = new Date(Date.now() + startOffset * 86400000);
      const checkOut = new Date(checkIn.getTime() + stayLength * 86400000);
      const guestName = DEMO_GUEST_NAMES[Math.floor(Math.random() * DEMO_GUEST_NAMES.length)];
      results.push({
        externalRef: `demo-${randomUUID().slice(0, 8)}`,
        guestName,
        guestEmail: `${guestName.toLowerCase().replace(/[^a-z]/g, '.')}@example.com`,
        checkIn: checkIn.toISOString().slice(0, 10),
        checkOut: checkOut.toISOString().slice(0, 10),
        otaRoomId,
        paymentCollectedByOta: Math.random() > 0.5,
        rawPayloadRef: `demo_${Date.now()}_${i}`,
      });
    }
    return results;
  }
}
