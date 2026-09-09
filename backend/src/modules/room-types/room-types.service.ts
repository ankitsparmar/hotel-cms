import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RatePlan } from '../rate-plans/entities/rate-plan.entity';
import { Room } from '../rooms/entities/room.entity';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomType } from './entities/room-type.entity';

@Injectable()
export class RoomTypesService {
  constructor(
    @InjectRepository(RoomType) private roomTypes: Repository<RoomType>,
    @InjectRepository(Room) private rooms: Repository<Room>,
    @InjectRepository(RatePlan) private ratePlans: Repository<RatePlan>,
  ) {}

  findAll(propertyId: string, includeArchived = false) {
    return this.roomTypes.find({
      where: includeArchived ? { propertyId } : { propertyId, archived: false },
      order: { name: 'ASC' },
    });
  }

  async findOne(propertyId: string, id: string) {
    const rt = await this.roomTypes.findOne({ where: { id, propertyId } });
    if (!rt) throw new NotFoundException('Room type not found');
    return rt;
  }

  create(propertyId: string, dto: CreateRoomTypeDto) {
    if (!dto.name || dto.maxOccupancy === undefined || dto.baseRate === undefined) {
      throw new BadRequestException('name, maxOccupancy and baseRate are required');
    }
    const rt = this.roomTypes.create({
      propertyId,
      name: dto.name,
      description: dto.description,
      maxOccupancy: dto.maxOccupancy,
      baseRate: dto.baseRate.toFixed(2),
      amenities: dto.amenities ?? [],
      photos: dto.photos ?? [],
      otaRoomId: dto.otaRoomId,
    });
    return this.roomTypes.save(rt);
  }

  async update(propertyId: string, id: string, dto: UpdateRoomTypeDto) {
    const rt = await this.findOne(propertyId, id);
    Object.assign(rt, {
      ...dto,
      baseRate: dto.baseRate !== undefined ? dto.baseRate.toFixed(2) : rt.baseRate,
    });
    return this.roomTypes.save(rt);
  }

  // Hard delete only when nothing references this room type at all —
  // otherwise archive (spec §5: "A room cannot be deleted if it has any
  // reservation history — only archived", generalised to the type level).
  async remove(propertyId: string, id: string) {
    await this.findOne(propertyId, id);
    const [roomCount, rateCount] = await Promise.all([
      this.rooms.count({ where: { roomTypeId: id } }),
      this.ratePlans.count({ where: { roomTypeId: id } }),
    ]);
    if (roomCount + rateCount > 0) {
      throw new ConflictException('Room type has rooms or rate plans — archive instead of deleting');
    }
    await this.roomTypes.delete({ id, propertyId });
    return { deleted: true };
  }
}
