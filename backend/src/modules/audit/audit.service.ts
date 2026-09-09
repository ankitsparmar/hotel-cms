import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(params: {
    propertyId: string;
    actorId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }) {
    const entry = this.repo.create({
      propertyId: params.propertyId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ?? {},
    });
    await this.repo.save(entry);
  }

  findForProperty(propertyId: string) {
    return this.repo.find({ where: { propertyId }, order: { createdAt: 'DESC' }, take: 200 });
  }
}
