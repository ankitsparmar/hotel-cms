import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { HousekeepingTaskStatus, HousekeepingTaskType, RoomStatus } from '../../common/enums';
import { HousekeepingTask } from './entities/housekeeping-task.entity';

@Injectable()
export class HousekeepingService {
  constructor(@InjectRepository(HousekeepingTask) private tasks: Repository<HousekeepingTask>) {}

  findAll(propertyId: string, status?: HousekeepingTaskStatus) {
    return this.tasks.find({
      where: status ? { propertyId, status } : { propertyId },
      relations: { room: true, assignee: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Called from ReservationsService inside the checkout transaction —
  // accepts an optional EntityManager so the task row is created
  // atomically with the checkout itself (spec §8: "Checkout automatically
  // ... creates a HousekeepingTask").
  async createCheckoutTask(propertyId: string, roomId: string, manager?: EntityManager) {
    const repo = manager ? manager.getRepository(HousekeepingTask) : this.tasks;
    const task = repo.create({
      propertyId,
      roomId,
      type: HousekeepingTaskType.CHECKOUT_CLEAN,
      status: HousekeepingTaskStatus.PENDING,
    });
    return repo.save(task);
  }

  async createManualTask(propertyId: string, roomId: string, type: HousekeepingTaskType, assignedTo?: string) {
    const task = this.tasks.create({ propertyId, roomId, type, assignedTo, status: HousekeepingTaskStatus.PENDING });
    return this.tasks.save(task);
  }

  async assign(propertyId: string, id: string, assignedTo: string) {
    const task = await this.tasks.findOne({ where: { id, propertyId } });
    if (!task) throw new NotFoundException('Task not found');
    task.assignedTo = assignedTo;
    task.status = HousekeepingTaskStatus.IN_PROGRESS;
    return this.tasks.save(task);
  }

  // Marking a task done flips the room to clean (or inspected, if the
  // caller signals a supervisor sign-off — spec §8's optional inspection
  // step) — the caller is RoomsService.setStatus via the controller, kept
  // separate so the task/room state changes each stay in their own
  // service but the controller sequences them together.
  async complete(actor: AuthUser, id: string) {
    const task = await this.tasks.findOne({ where: { id, propertyId: actor.propertyId } });
    if (!task) throw new NotFoundException('Task not found');
    task.status = HousekeepingTaskStatus.DONE;
    task.completedAt = new Date();
    return this.tasks.save(task);
  }
}
