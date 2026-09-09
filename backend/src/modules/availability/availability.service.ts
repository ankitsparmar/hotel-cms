import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';

// Spec §6: availability = room_type.total_rooms − overlapping_confirmed_reservations,
// computed here for display/UX purposes only. The actual "never double-book"
// guarantee comes from the Postgres EXCLUDE constraint on reservation_rooms
// (see migrations/…DoubleBookingExclusionConstraint.ts) — this endpoint can
// race under concurrent load and that's fine, because the write path can't.
@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Room) private rooms: Repository<Room>,
    @InjectRepository(RoomType) private roomTypes: Repository<RoomType>,
  ) {}

  async availability(propertyId: string, from: string, to: string, roomTypeId?: string) {
    if (!from || !to || from >= to) {
      throw new BadRequestException('from must be a valid date before to');
    }

    const roomTypeWhere: Record<string, unknown> = { propertyId, archived: false };
    if (roomTypeId) roomTypeWhere.id = roomTypeId;
    const types = await this.roomTypes.find({ where: roomTypeWhere });

    const results = [];
    for (const type of types) {
      const totalRooms = await this.rooms.count({
        where: { propertyId, roomTypeId: type.id, archived: false },
      });

      // A room counts as unavailable for the range if it has any active
      // reservation_rooms row (pending/confirmed/checked_in) whose stay
      // overlaps [from, to), OR it's currently out_of_order.
      const overlapping = await this.rooms.manager.query(
        `
        SELECT COUNT(DISTINCT r."id")::int AS count
        FROM rooms r
        WHERE r."roomTypeId" = $1
          AND r."archived" = false
          AND (
            r."status" = 'out_of_order'
            OR EXISTS (
              SELECT 1 FROM reservation_rooms rr
              WHERE rr."roomId" = r."id"
                AND rr."active" = true
                AND rr."stay" && daterange($2::date, $3::date, '[)')
            )
          )
        `,
        [type.id, from, to],
      );
      const unavailable = overlapping[0]?.count ?? 0;

      results.push({
        roomTypeId: type.id,
        roomTypeName: type.name,
        totalRooms,
        unavailable,
        available: Math.max(totalRooms - unavailable, 0),
        baseRate: type.baseRate,
      });
    }
    return { from, to, roomTypes: results };
  }

  // Calendar view: rooms down the side, each with its bookings/status for
  // the range, plus a coarse per-day status for the colour-coding described
  // in §6 (vacant / occupied / arriving / departing / ooo / ota-sourced).
  async calendar(propertyId: string, from: string, to: string) {
    const rooms = await this.rooms.find({ where: { propertyId, archived: false }, relations: { roomType: true }, order: { roomNumber: 'ASC' } });
    const rows = await this.rooms.manager.query(
      `
      SELECT rr."roomId", rr."checkIn", rr."checkOut", rr."active", res."status", res."source", res."id" as "reservationId", g."name" as "guestName"
      FROM reservation_rooms rr
      JOIN reservations res ON res."id" = rr."reservationId"
      JOIN guests g ON g."id" = res."guestId"
      WHERE rr."active" = true
        AND res."propertyId" = $1
        AND rr."stay" && daterange($2::date, $3::date, '[)')
      `,
      [propertyId, from, to],
    );

    const byRoom: Record<string, any[]> = {};
    for (const row of rows) {
      byRoom[row.roomId] = byRoom[row.roomId] || [];
      byRoom[row.roomId].push(row);
    }

    return rooms.map((room) => ({
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomTypeName: room.roomType?.name,
      status: room.status,
      bookings: (byRoom[room.id] || []).map((b) => ({
        reservationId: b.reservationId,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        status: b.status,
        source: b.source,
        guestName: b.guestName,
      })),
    }));
  }
}
