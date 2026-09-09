import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReservationRoom } from '../reservations/entities/reservation-room.entity';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { RatePlan } from './entities/rate-plan.entity';

const EXCLUSION_VIOLATION = '23P01';

@Injectable()
export class RatePlansService {
  constructor(
    @InjectRepository(RatePlan) private ratePlans: Repository<RatePlan>,
    @InjectRepository(ReservationRoom) private reservationRooms: Repository<ReservationRoom>,
  ) {}

  findAll(propertyId: string, roomTypeId?: string) {
    return this.ratePlans.find({
      where: roomTypeId ? { propertyId, roomTypeId } : { propertyId },
      order: { validFrom: 'ASC' },
    });
  }

  async create(propertyId: string, dto: CreateRatePlanDto) {
    if (dto.validFrom > dto.validTo) {
      throw new BadRequestException('validFrom must be on or before validTo');
    }
    const plan = this.ratePlans.create({
      propertyId,
      roomTypeId: dto.roomTypeId,
      name: dto.name,
      price: dto.price.toFixed(2),
      validFrom: dto.validFrom,
      validTo: dto.validTo,
      restrictions: dto.restrictions ?? {},
    });
    try {
      return await this.ratePlans.save(plan);
    } catch (err: any) {
      // Postgres exclusion-constraint violation -> overlapping rate plan
      // for the same room type & date range (spec §7 acceptance criterion:
      // rejected at creation, never silently resolved by priority).
      if (err?.code === EXCLUSION_VIOLATION) {
        throw new ConflictException('An existing rate plan already covers part of this date range for this room type');
      }
      throw err;
    }
  }

  async remove(propertyId: string, id: string) {
    const plan = await this.ratePlans.findOne({ where: { id, propertyId } });
    if (!plan) throw new NotFoundException('Rate plan not found');
    // Rate changes never retroactively alter price_at_booking (spec §7) —
    // deleting the plan itself is fine since booked prices are copied onto
    // ReservationRoom.priceAtBooking at booking time, not looked up live.
    await this.ratePlans.delete({ id, propertyId });
    return { deleted: true };
  }

  // Most-specific matching rate plan wins for a date; base rate is the
  // fallback (spec §7). "Most specific" = shortest validity window that
  // still covers the date.
  async priceForDate(roomTypeId: string, date: string, baseRate: string): Promise<string> {
    const candidates = await this.ratePlans.find({ where: { roomTypeId } });
    const matching = candidates.filter((p) => p.validFrom <= date && date <= p.validTo);
    if (matching.length === 0) return baseRate;
    matching.sort((a, b) => {
      const spanA = new Date(a.validTo).getTime() - new Date(a.validFrom).getTime();
      const spanB = new Date(b.validTo).getTime() - new Date(b.validFrom).getTime();
      return spanA - spanB;
    });
    return matching[0].price;
  }
}
