import { IsEnum, IsOptional, IsString } from 'class-validator';
import { HousekeepingTaskType } from '../../../common/enums';

export class CreateTaskDto {
  @IsString()
  roomId: string;

  @IsEnum(HousekeepingTaskType)
  type: HousekeepingTaskType;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
