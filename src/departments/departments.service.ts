import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { Department } from "./department.entity";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    currentUser: CurrentUserPayload,
  ): Promise<Department> {
    const department = this.departmentRepository.create(createDepartmentDto);
    const savedDepartment = await this.departmentRepository.save(department);

    await this.auditLogService.log({
      entityName: "Department",
      entityId: savedDepartment.id,
      userId: currentUser.id,
      action: "CREATE",
      oldValues: null,
      newValues: this.serializeDepartment(savedDepartment),
    });

    return savedDepartment;
  }

  findAll(): Promise<Department[]> {
    return this.departmentRepository.find({
      relations: ["employees"],
      order: { name: "ASC" },
    });
  }

  async findOne(id: string): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ["employees"],
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    currentUser: CurrentUserPayload,
  ): Promise<Department> {
    const department = await this.findOne(id);
    const oldValues = this.serializeDepartment(department);

    Object.assign(department, updateDepartmentDto);
    const savedDepartment = await this.departmentRepository.save(department);

    await this.auditLogService.log({
      entityName: "Department",
      entityId: savedDepartment.id,
      userId: currentUser.id,
      action: "UPDATE",
      oldValues,
      newValues: this.serializeDepartment(savedDepartment),
    });

    return savedDepartment;
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const department = await this.findOne(id);
    const oldValues = this.serializeDepartment(department);

    await this.departmentRepository.remove(department);
    await this.auditLogService.log({
      entityName: "Department",
      entityId: id,
      userId: currentUser.id,
      action: "DELETE",
      oldValues,
      newValues: null,
    });
  }

  private serializeDepartment(department: Department): Record<string, unknown> {
    return {
      id: department.id,
      name: department.name,
      description: department.description ?? null,
    };
  }
}
