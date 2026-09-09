import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'csv-parse/sync';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { PROPERTY_ADMIN_ROLES, RoomStatus } from '../../common/enums';
import { RoomStatusLog } from '../housekeeping/entities/room-status-log.entity';
import { ReservationRoom } from '../reservations/entities/reservation-room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private rooms: Repository<Room>,
    @InjectRepository(RoomStatusLog) private statusLogs: Repository<RoomStatusLog>,
    @InjectRepository(ReservationRoom) private reservationRooms: Repository<ReservationRoom>,
  ) {}

  findAll(propertyId: string, filters: { status?: RoomStatus; roomTypeId?: string; includeArchived?: boolean }) {
    const where: Record<string, unknown> = { propertyId };
    if (filters.status) where.status = filters.status;
    if (filters.roomTypeId) where.roomTypeId = filters.roomTypeId;
    if (!filters.includeArchived) where.archived = false;
    return this.rooms.find({ where, relations: { roomType: true }, order: { roomNumber: 'ASC' } });
  }

  async findOne(propertyId: string, id: string) {
    const room = await this.rooms.findOne({ where: { id, propertyId }, relations: { roomType: true } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async create(propertyId: string, dto: CreateRoomDto) {
    const room = this.rooms.create({
      propertyId,
      roomTypeId: dto.roomTypeId,
      roomNumber: dto.roomNumber,
      floor: dto.floor,
      status: RoomStatus.CLEAN,
    });
    return this.rooms.save(room);
  }

  async update(actor: AuthUser, id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(actor.propertyId, id);
    Object.assign(room, dto);
    return this.rooms.save(room);
  }

  async remove(propertyId: string, id: string) {
    await this.findOne(propertyId, id);
    const count = await this.reservationRooms.count({ where: { roomId: id } });
    if (count > 0) {
      throw new ConflictException('Room has reservation history — archive instead of deleting');
    }
    await this.rooms.delete({ id, propertyId });
    return { deleted: true };
  }

  async bulkImportCsv(propertyId: string, csvText: string) {
    const rows: { room_number: string; room_type_id: string; floor?: string }[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    const created: Room[] = [];
    for (const row of rows) {
      if (!row.room_number || !row.room_type_id) continue;
      const room = this.rooms.create({
        propertyId,
        roomNumber: row.room_number,
        roomTypeId: row.room_type_id,
        floor: row.floor,
        status: RoomStatus.CLEAN,
      });
      created.push(await this.rooms.save(room));
    }
    return { imported: created.length, rooms: created };
  }

  // Central status-transition entry point, used by housekeeping, front
  // desk overrides at check-in, and the checkout flow. Every change is
  // written to RoomStatusLog (spec §8/§14).
  async setStatus(actor: AuthUser, id: string, dto: UpdateRoomStatusDto) {
    const room = await this.findOne(actor.propertyId, id);
    const isAdmin = PROPERTY_ADMIN_ROLES.includes(actor.role as any);

    if (dto.status === RoomStatus.OUT_OF_ORDER) {
      if (!isAdmin) throw new ForbiddenException('Only Owner/Admin can mark a room out of order');
      if (!dto.reason) throw new BadRequestException('A reason is required to set a room out of order');
    }
    if (room.status === RoomStatus.OUT_OF_ORDER && dto.status !== RoomStatus.OUT_OF_ORDER && !isAdmin) {
      throw new ForbiddenException('Only Owner/Admin can clear an out-of-order room');
    }

    room.status = dto.status;
    room.outOfOrderReason = dto.status === RoomStatus.OUT_OF_ORDER ? dto.reason : undefined;
    await this.rooms.save(room);

    const log = this.statusLogs.create({
      roomId: room.id,
      status: dto.status,
      changedBy: actor.userId,
      reason: dto.reason,
      wasOverride: !!dto.override,
    });
    await this.statusLogs.save(log);

    return room;
  }

  history(propertyId: string, roomId: string) {
    return this.statusLogs.find({ where: { roomId }, order: { changedAt: 'DESC' } });
  }
}
