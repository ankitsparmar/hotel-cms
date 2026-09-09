import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PROPERTY_ADMIN_ROLES, ReservationSource, ReservationStatus, RoomStatus, UserRole } from '../../common/enums';
import { Guest } from '../guests/entities/guest.entity';
import { HousekeepingService } from '../housekeeping/housekeeping.service';
import { RoomStatusLog } from '../housekeeping/entities/room-status-log.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { RatePlansService } from '../rate-plans/rate-plans.service';
import { RatePlan } from '../rate-plans/entities/rate-plan.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomType } from '../room-types/entities/room-type.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReassignRoomDto } from './dto/reassign-room.dto';
import { ReservationRoom } from './entities/reservation-room.entity';
import { Reservation } from './entities/reservation.entity';

const EXCLUSION_VIOLATION = '23P01';

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(Math.round(ms / (1000 * 60 * 60 * 24)), 1);
}

@Injectable()
export class ReservationsService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Reservation) private reservations: Repository<Reservation>,
    @InjectRepository(ReservationRoom) private reservationRooms: Repository<ReservationRoom>,
    @InjectRepository(Guest) private guests: Repository<Guest>,
    @InjectRepository(Room) private rooms: Repository<Room>,
    @InjectRepository(RoomType) private roomTypes: Repository<RoomType>,
    @InjectRepository(RoomStatusLog) private statusLogs: Repository<RoomStatusLog>,
    private ratePlans: RatePlansService,
    private housekeeping: HousekeepingService,
    private invoices: InvoicesService,
  ) {}

  findAll(propertyId: string, filters: { status?: ReservationStatus; from?: string; to?: string }) {
    const qb = this.reservations
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.guest', 'guest')
      .leftJoinAndSelect('r.rooms', 'rooms')
      .leftJoinAndSelect('rooms.room', 'room')
      .where('r.propertyId = :propertyId', { propertyId });
    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.from) qb.andWhere('r.checkOut > :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.checkIn < :to', { to: filters.to });
    return qb.orderBy('r.checkIn', 'ASC').getMany();
  }

  async findOne(propertyId: string, id: string) {
    const reservation = await this.reservations.findOne({
      where: { id, propertyId },
      relations: { guest: true, rooms: { room: true, ratePlan: true } },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  // Direct (front desk) creation. OTA-sourced reservations are created by
  // the sync worker via createFromOta(), never through this path.
  async create(actor: AuthUser, dto: CreateReservationDto) {
    if (dto.checkIn >= dto.checkOut) {
      throw new BadRequestException('checkIn must be before checkOut');
    }

    return this.dataSource.transaction(async (manager) => {
      let guest: Guest | null = null;
      if (dto.guest.email) {
        guest = await manager.getRepository(Guest).findOne({ where: { propertyId: actor.propertyId, email: dto.guest.email } });
      }
      if (!guest) {
        guest = manager.getRepository(Guest).create({
          propertyId: actor.propertyId,
          name: dto.guest.name,
          email: dto.guest.email,
          phone: dto.guest.phone,
        });
        guest = await manager.getRepository(Guest).save(guest);
      }

      const reservation = manager.getRepository(Reservation).create({
        propertyId: actor.propertyId,
        guestId: guest.id,
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        status: ReservationStatus.CONFIRMED,
        source: ReservationSource.DIRECT,
        statusHistory: [{ status: ReservationStatus.CONFIRMED, at: new Date().toISOString(), by: actor.userId }],
      });
      await manager.getRepository(Reservation).save(reservation);

      const nights = nightsBetween(dto.checkIn, dto.checkOut);
      for (const sel of dto.rooms) {
        const room = await manager.getRepository(Room).findOne({ where: { id: sel.roomId, propertyId: actor.propertyId } });
        if (!room) throw new NotFoundException(`Room ${sel.roomId} not found`);
        if (room.status === RoomStatus.OUT_OF_ORDER) {
          throw new ConflictException(`Room ${room.roomNumber} is out of order`);
        }
        const roomType = await manager.getRepository(RoomType).findOne({ where: { id: room.roomTypeId } });

        let nightlyRate: string;
        if (sel.ratePlanId) {
          const plan = await manager.getRepository(RatePlan).findOne({ where: { id: sel.ratePlanId } });
          nightlyRate = plan?.price ?? roomType!.baseRate;
        } else {
          nightlyRate = await this.ratePlans.priceForDate(room.roomTypeId, dto.checkIn, roomType!.baseRate);
        }

        const reservationRoom = manager.getRepository(ReservationRoom).create({
          reservationId: reservation.id,
          roomId: room.id,
          ratePlanId: sel.ratePlanId,
          priceAtBooking: (Number(nightlyRate) * nights).toFixed(2),
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          active: true,
        });

        try {
          await manager.getRepository(ReservationRoom).save(reservationRoom);
        } catch (err: any) {
          if (err?.code === EXCLUSION_VIOLATION) {
            // This is the concurrency guarantee from §6 firing for real:
            // two simultaneous requests for the last room of a type — the
            // database itself rejected the second INSERT.
            throw new ConflictException(`Room ${room.roomNumber} is no longer available for these dates`);
          }
          throw err;
        }
      }

      return manager.getRepository(Reservation).findOne({
        where: { id: reservation.id },
        relations: { guest: true, rooms: { room: true } },
      });
    });
  }

  // Entry point used by the OTA sync worker (§11). OTA reservations enter
  // directly at CONFIRMED and are flagged payment_via_ota when applicable.
  async createFromOta(params: {
    propertyId: string;
    otaChannelId: string;
    externalRef: string;
    guest: { name: string; email?: string; phone?: string; otaGuestRef?: string };
    checkIn: string;
    checkOut: string;
    roomTypeId: string;
    paymentViaOta: boolean;
    rawPayloadRef?: string;
  }) {
    const existing = await this.reservations.findOne({ where: { propertyId: params.propertyId, externalRef: params.externalRef } });
    if (existing) return existing; // idempotent re-delivery (§11)

    return this.dataSource.transaction(async (manager) => {
      let guest = params.guest.email
        ? await manager.getRepository(Guest).findOne({ where: { propertyId: params.propertyId, email: params.guest.email } })
        : null;
      if (!guest) {
        guest = manager.getRepository(Guest).create({ propertyId: params.propertyId, ...params.guest });
        guest = await manager.getRepository(Guest).save(guest);
      }

      const reservation = manager.getRepository(Reservation).create({
        propertyId: params.propertyId,
        guestId: guest.id,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        status: ReservationStatus.CONFIRMED,
        source: ReservationSource.BOOKING_COM,
        externalRef: params.externalRef,
        otaChannelId: params.otaChannelId,
        paymentViaOta: params.paymentViaOta,
        rawPayloadRef: params.rawPayloadRef,
        statusHistory: [{ status: ReservationStatus.CONFIRMED, at: new Date().toISOString(), note: 'Imported from Booking.com' }],
      });
      await manager.getRepository(Reservation).save(reservation);

      // Pick any available, non-OOO room of the mapped room type — OTA
      // notifications identify a room *type*, not a specific physical room.
      const candidateRoom = await manager
        .getRepository(Room)
        .createQueryBuilder('room')
        .where('room."propertyId" = :propertyId', { propertyId: params.propertyId })
        .andWhere('room."roomTypeId" = :roomTypeId', { roomTypeId: params.roomTypeId })
        .andWhere('room."archived" = false')
        .andWhere('room."status" != :ooo', { ooo: RoomStatus.OUT_OF_ORDER })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM reservation_rooms rr WHERE rr."roomId" = room."id" AND rr."active" = true AND rr."stay" && daterange(:checkIn::date, :checkOut::date, '[)'))`,
          { checkIn: params.checkIn, checkOut: params.checkOut },
        )
        .getOne();

      if (!candidateRoom) {
        throw new ConflictException(`No available room of the mapped type for OTA reservation ${params.externalRef}`);
      }

      const roomType = await manager.getRepository(RoomType).findOne({ where: { id: params.roomTypeId } });
      const nights = nightsBetween(params.checkIn, params.checkOut);
      const nightlyRate = await this.ratePlans.priceForDate(params.roomTypeId, params.checkIn, roomType!.baseRate);

      const reservationRoom = manager.getRepository(ReservationRoom).create({
        reservationId: reservation.id,
        roomId: candidateRoom.id,
        priceAtBooking: (Number(nightlyRate) * nights).toFixed(2),
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        active: true,
      });
      await manager.getRepository(ReservationRoom).save(reservationRoom);

      return reservation;
    });
  }

  async checkIn(actor: AuthUser, id: string, dto: CheckInDto) {
    const reservation = await this.findOne(actor.propertyId, id);
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot check in a reservation with status ${reservation.status}`);
    }
    const today = new Date().toISOString().slice(0, 10);
    if (reservation.checkIn > today) {
      throw new BadRequestException('Reservation check-in date is in the future');
    }

    const isAdmin = PROPERTY_ADMIN_ROLES.includes(actor.role as UserRole) || actor.role === UserRole.FRONT_DESK;
    for (const rr of reservation.rooms) {
      const room = await this.rooms.findOne({ where: { id: rr.roomId } });
      const ready = room && [RoomStatus.CLEAN, RoomStatus.INSPECTED].includes(room.status);
      if (!ready && !dto.override) {
        throw new ConflictException(`Room ${room?.roomNumber} is not clean/inspected — pass override:true to force (logged)`);
      }
      if (!ready && dto.override) {
        if (!isAdmin) throw new ForbiddenException('Only Front desk/Admin/Owner can override room readiness at check-in');
        await this.statusLogs.save(
          this.statusLogs.create({
            roomId: rr.roomId,
            status: room!.status,
            changedBy: actor.userId,
            reason: 'Front-desk override at check-in',
            wasOverride: true,
          }),
        );
      }
    }

    reservation.status = ReservationStatus.CHECKED_IN;
    reservation.statusHistory = [
      ...reservation.statusHistory,
      { status: ReservationStatus.CHECKED_IN, at: new Date().toISOString(), by: actor.userId },
    ];
    return this.reservations.save(reservation);
  }

  async checkOut(actor: AuthUser, id: string) {
    const reservation = await this.findOne(actor.propertyId, id);
    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException(`Cannot check out a reservation with status ${reservation.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      reservation.status = ReservationStatus.CHECKED_OUT;
      reservation.statusHistory = [
        ...reservation.statusHistory,
        { status: ReservationStatus.CHECKED_OUT, at: new Date().toISOString(), by: actor.userId },
      ];
      await manager.getRepository(Reservation).save(reservation);

      const lineItems = [];
      for (const rr of reservation.rooms) {
        await manager.getRepository(ReservationRoom).update(rr.id, { active: false });

        const room = await manager.getRepository(Room).findOne({ where: { id: rr.roomId } });
        if (room && room.status !== RoomStatus.OUT_OF_ORDER) {
          room.status = RoomStatus.DIRTY;
          await manager.getRepository(Room).save(room);
          await manager.getRepository(RoomStatusLog).save(
            manager.getRepository(RoomStatusLog).create({
              roomId: room.id,
              status: RoomStatus.DIRTY,
              changedBy: actor.userId,
              reason: 'Checkout',
            }),
          );
          await this.housekeeping.createCheckoutTask(actor.propertyId, room.id, manager);
        }

        const nights = nightsBetween(rr.checkIn, rr.checkOut);
        lineItems.push({
          description: `Room ${room?.roomNumber ?? rr.roomId} (${nights} night${nights > 1 ? 's' : ''})`,
          quantity: nights,
          unitPrice: (Number(rr.priceAtBooking) / nights).toFixed(2),
          total: Number(rr.priceAtBooking).toFixed(2),
        });
      }

      const invoice = reservation.paymentViaOta ? null : await this.invoices.generateForCheckout(reservation.id, lineItems, manager);
      return { reservation, invoice };
    });
  }

  async cancel(actor: AuthUser, id: string, note?: string) {
    const reservation = await this.findOne(actor.propertyId, id);
    if ([ReservationStatus.CHECKED_OUT, ReservationStatus.CANCELLED].includes(reservation.status)) {
      throw new BadRequestException(`Reservation already ${reservation.status}`);
    }

    const requiresOtaCancellation = reservation.source === ReservationSource.BOOKING_COM;

    reservation.status = ReservationStatus.CANCELLED;
    reservation.statusHistory = [
      ...reservation.statusHistory,
      {
        status: ReservationStatus.CANCELLED,
        at: new Date().toISOString(),
        by: actor.userId,
        note: requiresOtaCancellation
          ? `Cancelled locally only — staff must also cancel via the Booking.com extranet. ${note ?? ''}`.trim()
          : note,
      },
    ];
    await this.reservations.save(reservation);
    await this.reservationRooms.update({ reservationId: id }, { active: false });

    return { reservation, requiresOtaCancellation };
  }

  async markNoShow(actor: AuthUser, id: string) {
    const reservation = await this.findOne(actor.propertyId, id);
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Only a confirmed reservation can be marked no-show');
    }
    reservation.status = ReservationStatus.NO_SHOW;
    reservation.statusHistory = [...reservation.statusHistory, { status: ReservationStatus.NO_SHOW, at: new Date().toISOString(), by: actor.userId }];
    await this.reservations.save(reservation);
    await this.reservationRooms.update({ reservationId: id }, { active: false });
    return reservation;
  }

  // Guest can be re-assigned to a different physical room of the SAME
  // room type; dates/room type/price stay read-only — matching what
  // Booking.com itself allows a property to change without contacting the
  // guest (spec §9). Applies to direct bookings too, just less restricted
  // in practice since front desk already controls the whole reservation.
  async reassignRoom(actor: AuthUser, id: string, dto: ReassignRoomDto) {
    const reservation = await this.findOne(actor.propertyId, id);
    const rr = reservation.rooms.find((x) => x.id === dto.reservationRoomId);
    if (!rr) throw new NotFoundException('Reservation room not found');

    const currentRoom = await this.rooms.findOne({ where: { id: rr.roomId } });
    const newRoom = await this.rooms.findOne({ where: { id: dto.newRoomId, propertyId: actor.propertyId } });
    if (!newRoom) throw new NotFoundException('Target room not found');
    if (newRoom.roomTypeId !== currentRoom?.roomTypeId) {
      throw new BadRequestException('Can only reassign to a room of the same room type');
    }

    try {
      await this.reservationRooms.update(rr.id, { roomId: newRoom.id });
    } catch (err: any) {
      if (err?.code === EXCLUSION_VIOLATION) {
        throw new ConflictException(`Room ${newRoom.roomNumber} is not available for these dates`);
      }
      throw err;
    }
    return this.findOne(actor.propertyId, id);
  }
}
