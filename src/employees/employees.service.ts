import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { Department } from "../departments/department.entity";
import { Role } from "../roles/role.entity";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { Employee } from "./employee.entity";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    createEmployeeDto: CreateEmployeeDto,
    currentUser: CurrentUserPayload,
  ): Promise<Employee> {
    const [department, manager, role] = await Promise.all([
      this.resolveDepartment(createEmployeeDto.departmentId),
      this.resolveManager(createEmployeeDto.managerId),
      this.resolveRole(createEmployeeDto.roleName ?? UserRole.EMPLOYEE),
    ]);

    const employee = this.employeeRepository.create({
      firstName: createEmployeeDto.firstName,
      lastName: createEmployeeDto.lastName,
      email: createEmployeeDto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(createEmployeeDto.password, 12),
      jobTitle: createEmployeeDto.jobTitle,
      isActive: createEmployeeDto.isActive ?? true,
      department,
      manager,
      role,
    });

    const savedEmployee = await this.employeeRepository.save(employee);

    await this.auditLogService.log({
      entityName: "Employee",
      entityId: savedEmployee.id,
      userId: currentUser.id,
      action: "CREATE",
      oldValues: null,
      newValues: this.serializeEmployee(savedEmployee),
    });

    return this.findOne(savedEmployee.id);
  }

  findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      relations: ["department", "manager", "role"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ["department", "manager", "role"],
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentUser: CurrentUserPayload,
  ): Promise<Employee> {
    const employee = await this.findOne(id);
    const oldValues = this.serializeEmployee(employee);

    if (updateEmployeeDto.firstName !== undefined) {
      employee.firstName = updateEmployeeDto.firstName;
    }

    if (updateEmployeeDto.lastName !== undefined) {
      employee.lastName = updateEmployeeDto.lastName;
    }

    if (updateEmployeeDto.email !== undefined) {
      employee.email = updateEmployeeDto.email.toLowerCase();
    }

    if (updateEmployeeDto.password !== undefined) {
      employee.passwordHash = await bcrypt.hash(updateEmployeeDto.password, 12);
    }

    if (updateEmployeeDto.jobTitle !== undefined) {
      employee.jobTitle = updateEmployeeDto.jobTitle;
    }

    if (updateEmployeeDto.isActive !== undefined) {
      employee.isActive = updateEmployeeDto.isActive;
    }

    if (updateEmployeeDto.departmentId !== undefined) {
      employee.department = await this.resolveDepartment(
        updateEmployeeDto.departmentId,
      );
    }

    if (updateEmployeeDto.managerId !== undefined) {
      if (updateEmployeeDto.managerId === id) {
        throw new BadRequestException("Employee cannot be their own manager");
      }
      employee.manager = await this.resolveManager(updateEmployeeDto.managerId);
    }

    if (updateEmployeeDto.roleName !== undefined) {
      employee.role = await this.resolveRole(updateEmployeeDto.roleName);
    }

    const savedEmployee = await this.employeeRepository.save(employee);

    await this.auditLogService.log({
      entityName: "Employee",
      entityId: savedEmployee.id,
      userId: currentUser.id,
      action: "UPDATE",
      oldValues,
      newValues: this.serializeEmployee(savedEmployee),
    });

    return this.findOne(savedEmployee.id);
  }

  async remove(id: string, currentUser: CurrentUserPayload): Promise<void> {
    const employee = await this.findOne(id);
    const oldValues = this.serializeEmployee(employee);

    await this.employeeRepository.remove(employee);
    await this.auditLogService.log({
      entityName: "Employee",
      entityId: id,
      userId: currentUser.id,
      action: "DELETE",
      oldValues,
      newValues: null,
    });
  }

  private async resolveDepartment(
    departmentId?: string,
  ): Promise<Department | null> {
    if (!departmentId) {
      return null;
    }

    const department = await this.departmentRepository.findOneBy({
      id: departmentId,
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return department;
  }

  private async resolveManager(managerId?: string): Promise<Employee | null> {
    if (!managerId) {
      return null;
    }

    const manager = await this.employeeRepository.findOne({
      where: { id: managerId, isActive: true },
      relations: ["role"],
    });

    if (!manager) {
      throw new NotFoundException("Manager not found");
    }

    if (
      ![UserRole.MANAGER, UserRole.ADMIN, UserRole.HR].includes(
        manager.role.name,
      )
    ) {
      throw new BadRequestException(
        "Selected manager must have a management role",
      );
    }

    return manager;
  }

  private async resolveRole(roleName: UserRole): Promise<Role> {
    const role = await this.roleRepository.findOneBy({ name: roleName });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return role;
  }

  private serializeEmployee(employee: Employee): Record<string, unknown> {
    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      jobTitle: employee.jobTitle ?? null,
      isActive: employee.isActive,
      departmentId: employee.department?.id ?? null,
      managerId: employee.manager?.id ?? null,
      role: employee.role?.name ?? null,
    };
  }
}
