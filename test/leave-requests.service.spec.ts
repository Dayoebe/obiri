import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { AuditLogService } from "../src/audit-logs/audit-log.service";
import { ApprovalDecision } from "../src/common/enums/approval-decision.enum";
import { ApprovalStage } from "../src/common/enums/approval-stage.enum";
import { LeaveStatus } from "../src/common/enums/leave-status.enum";
import { UserRole } from "../src/common/enums/user-role.enum";
import { Employee } from "../src/employees/employee.entity";
import { LeaveType } from "../src/leave-types/leave-type.entity";
import { Approval } from "../src/leave-requests/approval.entity";
import { LeaveRequest } from "../src/leave-requests/leave-request.entity";
import { LeaveRequestsService } from "../src/leave-requests/leave-requests.service";

describe("LeaveRequestsService", () => {
  let service: LeaveRequestsService;
  let leaveRequestRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let approvalRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let employeeRepository: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
  };
  let leaveTypeRepository: {
    findOneBy: jest.Mock;
  };
  let auditLogService: {
    log: jest.Mock;
  };

  const manager = {
    id: "manager-1",
    email: "manager@erp.local",
    role: { name: UserRole.MANAGER },
  } as Employee;

  const employee = {
    id: "employee-1",
    email: "employee@erp.local",
    manager,
    role: { name: UserRole.EMPLOYEE },
  } as Employee;

  const leaveType = {
    id: "leave-type-1",
    name: "Annual Leave",
    isActive: true,
  } as LeaveType;

  beforeEach(() => {
    leaveRequestRepository = {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => ({
        ...input,
        id: input.id ?? "request-1",
      })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    approvalRepository = {
      create: jest.fn((input) => ({ ...input, id: "approval-1" })),
      save: jest.fn(async (input) => input),
    };

    employeeRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    leaveTypeRepository = {
      findOneBy: jest.fn(),
    };

    auditLogService = {
      log: jest.fn(async () => undefined),
    };

    service = new LeaveRequestsService(
      leaveRequestRepository as unknown as Repository<LeaveRequest>,
      approvalRepository as unknown as Repository<Approval>,
      employeeRepository as unknown as Repository<Employee>,
      leaveTypeRepository as unknown as Repository<LeaveType>,
      auditLogService as unknown as AuditLogService,
    );
  });

  it("moves a manager-approved request to HR while keeping it pending", async () => {
    const request = {
      id: "request-1",
      employee,
      leaveType,
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      reason: "Annual vacation",
      status: LeaveStatus.PENDING,
      currentStage: ApprovalStage.MANAGER,
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeaveRequest;

    leaveRequestRepository.findOne.mockResolvedValue(request);
    employeeRepository.findOneBy.mockResolvedValue(manager);

    await service.approve(
      "request-1",
      {
        id: manager.id,
        email: manager.email,
        role: UserRole.MANAGER,
      },
      { comments: "Approved by manager" },
    );

    expect(request.status).toBe(LeaveStatus.PENDING);
    expect(request.currentStage).toBe(ApprovalStage.HR);
    expect(approvalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: ApprovalStage.MANAGER,
        decision: ApprovalDecision.APPROVED,
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledTimes(2);
  });

  it("finalizes a request when HR approves the HR stage", async () => {
    const hr = {
      id: "hr-1",
      email: "hr@erp.local",
      role: { name: UserRole.HR },
    } as Employee;
    const request = {
      id: "request-1",
      employee,
      leaveType,
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      reason: "Annual vacation",
      status: LeaveStatus.PENDING,
      currentStage: ApprovalStage.HR,
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeaveRequest;

    leaveRequestRepository.findOne.mockResolvedValue(request);
    employeeRepository.findOneBy.mockResolvedValue(hr);

    await service.approve(
      "request-1",
      {
        id: hr.id,
        email: hr.email,
        role: UserRole.HR,
      },
      { comments: "Final HR approval" },
    );

    expect(request.status).toBe(LeaveStatus.APPROVED);
    expect(request.currentStage).toBe(ApprovalStage.COMPLETED);
    expect(approvalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: ApprovalStage.HR,
        decision: ApprovalDecision.APPROVED,
      }),
    );
  });

  it("rejects approval attempts for already finalized requests", async () => {
    const request = {
      id: "request-1",
      employee,
      leaveType,
      startDate: "2026-07-01",
      endDate: "2026-07-05",
      reason: "Annual vacation",
      status: LeaveStatus.APPROVED,
      currentStage: ApprovalStage.COMPLETED,
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as LeaveRequest;

    leaveRequestRepository.findOne.mockResolvedValue(request);

    await expect(
      service.approve(
        "request-1",
        {
          id: manager.id,
          email: manager.email,
          role: UserRole.MANAGER,
        },
        {},
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects leave requests when the end date is before the start date", async () => {
    await expect(
      service.create(
        {
          leaveTypeId: leaveType.id,
          startDate: "2026-07-05",
          endDate: "2026-07-01",
          reason: "Invalid dates",
        },
        {
          id: employee.id,
          email: employee.email,
          role: UserRole.EMPLOYEE,
        },
      ),
    ).rejects.toThrow("End date cannot be before start date");

    expect(employeeRepository.findOne).not.toHaveBeenCalled();
  });
});
