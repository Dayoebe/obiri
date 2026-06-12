import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { AuditLogService } from "../audit-logs/audit-log.service";
import { CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { ApprovalDecision } from "../common/enums/approval-decision.enum";
import { ApprovalStage } from "../common/enums/approval-stage.enum";
import { LeaveStatus } from "../common/enums/leave-status.enum";
import { UserRole } from "../common/enums/user-role.enum";
import { Employee } from "../employees/employee.entity";
import { LeaveType } from "../leave-types/leave-type.entity";
import { ApprovalActionDto } from "./dto/approval-action.dto";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { Approval } from "./approval.entity";
import { LeaveRequest } from "./leave-request.entity";

@Injectable()
export class LeaveRequestsService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(Approval)
    private readonly approvalRepository: Repository<Approval>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(LeaveType)
    private readonly leaveTypeRepository: Repository<LeaveType>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    createLeaveRequestDto: CreateLeaveRequestDto,
    currentUser: CurrentUserPayload,
  ): Promise<LeaveRequest> {
    this.validateDateRange(
      createLeaveRequestDto.startDate,
      createLeaveRequestDto.endDate,
    );

    const employee = await this.employeeRepository.findOne({
      where: { id: currentUser.id, isActive: true },
      relations: ["manager", "role", "department"],
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    if (employee.role.name === UserRole.EMPLOYEE && !employee.manager) {
      throw new BadRequestException(
        "Employee must be assigned to a manager before requesting leave",
      );
    }

    const leaveType = await this.leaveTypeRepository.findOneBy({
      id: createLeaveRequestDto.leaveTypeId,
      isActive: true,
    });

    if (!leaveType) {
      throw new NotFoundException("Leave type not found or inactive");
    }

    const leaveRequest = this.leaveRequestRepository.create({
      employee,
      leaveType,
      startDate: createLeaveRequestDto.startDate,
      endDate: createLeaveRequestDto.endDate,
      reason: createLeaveRequestDto.reason,
      status: LeaveStatus.PENDING,
      currentStage: employee.manager ? ApprovalStage.MANAGER : ApprovalStage.HR,
    });

    const savedLeaveRequest =
      await this.leaveRequestRepository.save(leaveRequest);

    await this.auditLogService.log({
      entityName: "LeaveRequest",
      entityId: savedLeaveRequest.id,
      userId: currentUser.id,
      action: "CREATE",
      oldValues: null,
      newValues: this.serializeLeaveRequest(savedLeaveRequest),
    });

    return this.findOne(savedLeaveRequest.id, currentUser);
  }

  async findAll(currentUser: CurrentUserPayload): Promise<LeaveRequest[]> {
    const relations = [
      "employee",
      "employee.manager",
      "leaveType",
      "approvals",
      "approvals.approver",
    ];

    if ([UserRole.ADMIN, UserRole.HR].includes(currentUser.role as UserRole)) {
      return this.leaveRequestRepository.find({
        relations,
        order: { createdAt: "DESC" },
      });
    }

    if (currentUser.role === UserRole.MANAGER) {
      const where: FindOptionsWhere<LeaveRequest>[] = [
        { employee: { id: currentUser.id } },
        { employee: { manager: { id: currentUser.id } } },
      ];

      return this.leaveRequestRepository.find({
        where,
        relations,
        order: { createdAt: "DESC" },
      });
    }

    return this.leaveRequestRepository.find({
      where: { employee: { id: currentUser.id } },
      relations,
      order: { createdAt: "DESC" },
    });
  }

  async findOne(
    id: string,
    currentUser: CurrentUserPayload,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: [
        "employee",
        "employee.manager",
        "leaveType",
        "approvals",
        "approvals.approver",
      ],
    });

    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
    }

    this.assertCanView(leaveRequest, currentUser);

    return leaveRequest;
  }

  approve(
    id: string,
    currentUser: CurrentUserPayload,
    approvalActionDto: ApprovalActionDto,
  ): Promise<LeaveRequest> {
    return this.processApprovalAction(
      id,
      currentUser,
      ApprovalDecision.APPROVED,
      approvalActionDto,
    );
  }

  reject(
    id: string,
    currentUser: CurrentUserPayload,
    approvalActionDto: ApprovalActionDto,
  ): Promise<LeaveRequest> {
    return this.processApprovalAction(
      id,
      currentUser,
      ApprovalDecision.REJECTED,
      approvalActionDto,
    );
  }

  private async processApprovalAction(
    id: string,
    currentUser: CurrentUserPayload,
    decision: ApprovalDecision,
    approvalActionDto: ApprovalActionDto,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: [
        "employee",
        "employee.manager",
        "leaveType",
        "approvals",
        "approvals.approver",
      ],
    });

    if (!leaveRequest) {
      throw new NotFoundException("Leave request not found");
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(
        "Cannot approve or reject a finalized request",
      );
    }

    if (leaveRequest.currentStage === ApprovalStage.COMPLETED) {
      throw new BadRequestException(
        "Leave request workflow is already complete",
      );
    }

    this.assertCanActOnCurrentStage(leaveRequest, currentUser);

    const oldValues = this.serializeLeaveRequest(leaveRequest);
    const stage = leaveRequest.currentStage;

    const approver = await this.employeeRepository.findOneBy({
      id: currentUser.id,
    });

    if (!approver) {
      throw new NotFoundException("Approver not found");
    }

    const approval = this.approvalRepository.create({
      leaveRequest,
      approver,
      stage,
      decision,
      comments: approvalActionDto.comments,
    });

    await this.approvalRepository.save(approval);

    if (decision === ApprovalDecision.REJECTED) {
      leaveRequest.status = LeaveStatus.REJECTED;
      leaveRequest.currentStage = ApprovalStage.COMPLETED;
    } else if (stage === ApprovalStage.MANAGER) {
      leaveRequest.status = LeaveStatus.PENDING;
      leaveRequest.currentStage = ApprovalStage.HR;
    } else if (stage === ApprovalStage.HR) {
      leaveRequest.status = LeaveStatus.APPROVED;
      leaveRequest.currentStage = ApprovalStage.COMPLETED;
    }

    const savedLeaveRequest =
      await this.leaveRequestRepository.save(leaveRequest);

    await Promise.all([
      this.auditLogService.log({
        entityName: "Approval",
        entityId: approval.id,
        userId: currentUser.id,
        action: decision,
        oldValues: null,
        newValues: {
          leaveRequestId: leaveRequest.id,
          stage,
          decision,
          comments: approval.comments ?? null,
        },
      }),
      this.auditLogService.log({
        entityName: "LeaveRequest",
        entityId: savedLeaveRequest.id,
        userId: currentUser.id,
        action: decision,
        oldValues,
        newValues: this.serializeLeaveRequest(savedLeaveRequest),
      }),
    ]);

    return this.findOne(savedLeaveRequest.id, currentUser);
  }

  private assertCanView(
    leaveRequest: LeaveRequest,
    currentUser: CurrentUserPayload,
  ): void {
    if ([UserRole.ADMIN, UserRole.HR].includes(currentUser.role as UserRole)) {
      return;
    }

    if (leaveRequest.employee.id === currentUser.id) {
      return;
    }

    if (
      currentUser.role === UserRole.MANAGER &&
      leaveRequest.employee.manager?.id === currentUser.id
    ) {
      return;
    }

    throw new ForbiddenException("You cannot access this leave request");
  }

  private assertCanActOnCurrentStage(
    leaveRequest: LeaveRequest,
    currentUser: CurrentUserPayload,
  ): void {
    if (currentUser.role === UserRole.ADMIN) {
      return;
    }

    if (leaveRequest.currentStage === ApprovalStage.MANAGER) {
      if (
        currentUser.role === UserRole.MANAGER &&
        leaveRequest.employee.manager?.id === currentUser.id
      ) {
        return;
      }

      throw new ForbiddenException(
        "Only the assigned manager can act on this stage",
      );
    }

    if (leaveRequest.currentStage === ApprovalStage.HR) {
      if (currentUser.role === UserRole.HR) {
        return;
      }

      throw new ForbiddenException("Only HR can act on this stage");
    }

    throw new BadRequestException("Invalid workflow transition");
  }

  private validateDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid leave date range");
    }

    if (end < start) {
      throw new BadRequestException("End date cannot be before start date");
    }
  }

  private serializeLeaveRequest(
    leaveRequest: LeaveRequest,
  ): Record<string, unknown> {
    return {
      id: leaveRequest.id,
      employeeId: leaveRequest.employee?.id,
      leaveTypeId: leaveRequest.leaveType?.id,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      currentStage: leaveRequest.currentStage,
    };
  }
}
