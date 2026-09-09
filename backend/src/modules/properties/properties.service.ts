import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(@InjectRepository(Property) private properties: Repository<Property>) {}

  async findOne(id: string) {
    const property = await this.properties.findOne({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const property = await this.findOne(id);
    Object.assign(property, dto);
    return this.properties.save(property);
  }
}
