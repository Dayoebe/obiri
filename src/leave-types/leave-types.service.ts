import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LeaveType } from "./leave-type.entity";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";

@Injectable()
export class LeaveTypesService {
  constructor(
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
  ) {}

  async create(createLeaveTypeDto: CreateLeaveTypeDto): Promise<LeaveType> {
    const leaveType = this.leaveTypeRepository.create({
      ...createLeaveTypeDto,
      annualAllowanceDays: createLeaveTypeDto.annualAllowanceDays ?? 0,
      isActive: createLeaveTypeDto.isActive ?? true,
    });

    return this.leaveTypeRepository.save(leaveType);
  }

  findAll(): Promise<LeaveType[]> {
    return this.leaveTypeRepository.find({ order: { name: "ASC" } });
  }

  async findOne(id: string): Promise<LeaveType> {
    const leaveType = await this.leaveTypeRepository.findOneBy({ id });

    if (!leaveType) {
      throw new NotFoundException("Leave type not found");
    }

    return leaveType;
  }

  async update(
    id: string,
    updateLeaveTypeDto: UpdateLeaveTypeDto,
  ): Promise<LeaveType> {
    const leaveType = await this.findOne(id);

    Object.assign(leaveType, updateLeaveTypeDto);

    return this.leaveTypeRepository.save(leaveType);
  }

  async remove(id: string): Promise<void> {
    const leaveType = await this.findOne(id);
    await this.leaveTypeRepository.remove(leaveType);
  }
}
