import * as bcrypt from "bcryptjs";
import { ApprovalDecision } from "../common/enums/approval-decision.enum";
import { ApprovalStage } from "../common/enums/approval-stage.enum";
import { LeaveStatus } from "../common/enums/leave-status.enum";
import { UserRole } from "../common/enums/user-role.enum";
import { Department } from "../departments/department.entity";
import { Employee } from "../employees/employee.entity";
import { Approval } from "../leave-requests/approval.entity";
import { LeaveRequest } from "../leave-requests/leave-request.entity";
import { LeaveType } from "../leave-types/leave-type.entity";
import { Role } from "../roles/role.entity";
import { AppDataSource } from "../database/data-source";

const DEFAULT_PASSWORD = "Password123!";

async function seedRoles() {
  const roleRepository = AppDataSource.getRepository(Role);
  const roleDescriptions: Record<UserRole, string> = {
    [UserRole.ADMIN]: "Full system access.",
    [UserRole.HR]: "Human resources leave administration and final approvals.",
    [UserRole.MANAGER]: "Manager access for subordinate leave approvals.",
    [UserRole.EMPLOYEE]: "Employee self-service leave access.",
  };

  const roles = {} as Record<UserRole, Role>;

  for (const roleName of Object.values(UserRole)) {
    let role = await roleRepository.findOneBy({ name: roleName });
    if (!role) {
      role = await roleRepository.save(
        roleRepository.create({
          name: roleName,
          description: roleDescriptions[roleName],
        }),
      );
    }
    roles[roleName] = role;
  }

  return roles;
}

async function seedDepartments() {
  const departmentRepository = AppDataSource.getRepository(Department);
  const departments = [
    {
      name: "Human Resources",
      description: "People operations, policies, and compliance.",
    },
    {
      name: "Engineering",
      description: "Product engineering and platform delivery.",
    },
    {
      name: "Finance",
      description: "Finance operations, payroll, and reporting.",
    },
  ];

  const departmentMap = new Map<string, Department>();

  for (const departmentData of departments) {
    let department = await departmentRepository.findOneBy({
      name: departmentData.name,
    });
    if (!department) {
      department = await departmentRepository.save(
        departmentRepository.create(departmentData),
      );
    }
    departmentMap.set(department.name, department);
  }

  return departmentMap;
}

async function seedLeaveTypes() {
  const leaveTypeRepository = AppDataSource.getRepository(LeaveType);
  const leaveTypes = [
    {
      name: "Annual Leave",
      description: "Paid vacation leave entitlement.",
      annualAllowanceDays: 20,
    },
    {
      name: "Sick Leave",
      description: "Leave for illness, medical appointments, or recovery.",
      annualAllowanceDays: 10,
    },
    {
      name: "Maternity Leave",
      description: "Leave for childbirth and postnatal care.",
      annualAllowanceDays: 90,
    },
    {
      name: "Compassionate Leave",
      description: "Leave for bereavement or urgent family circumstances.",
      annualAllowanceDays: 5,
    },
  ];

  const leaveTypeMap = new Map<string, LeaveType>();

  for (const leaveTypeData of leaveTypes) {
    let leaveType = await leaveTypeRepository.findOneBy({
      name: leaveTypeData.name,
    });
    if (!leaveType) {
      leaveType = await leaveTypeRepository.save(
        leaveTypeRepository.create({
          ...leaveTypeData,
          isActive: true,
        }),
      );
    } else {
      leaveType.description = leaveTypeData.description;
      leaveType.annualAllowanceDays = leaveTypeData.annualAllowanceDays;
      leaveType.isActive = true;
      leaveType = await leaveTypeRepository.save(leaveType);
    }
    leaveTypeMap.set(leaveType.name, leaveType);
  }

  return leaveTypeMap;
}

async function seedEmployees(
  roles: Record<UserRole, Role>,
  departments: Map<string, Department>,
) {
  const employeeRepository = AppDataSource.getRepository(Employee);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const humanResources = departments.get("Human Resources")!;
  const engineering = departments.get("Engineering")!;
  const finance = departments.get("Finance")!;

  const employeeMap = new Map<string, Employee>();

  async function upsertEmployee(input: {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    department: Department;
    jobTitle: string;
    manager?: Employee | null;
  }): Promise<Employee> {
    let employee = await employeeRepository.findOne({
      where: { email: input.email },
      relations: ["role", "department", "manager"],
    });

    if (!employee) {
      employee = employeeRepository.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash,
        role: input.role,
        department: input.department,
        manager: input.manager ?? null,
        jobTitle: input.jobTitle,
        isActive: true,
      });
    } else {
      employee.firstName = input.firstName;
      employee.lastName = input.lastName;
      employee.role = input.role;
      employee.department = input.department;
      employee.manager = input.manager ?? null;
      employee.jobTitle = input.jobTitle;
      employee.passwordHash = passwordHash;
      employee.isActive = true;
    }

    const savedEmployee = await employeeRepository.save(employee);
    employeeMap.set(savedEmployee.email, savedEmployee);
    return savedEmployee;
  }

  const admin = await upsertEmployee({
    firstName: "Adeleke",
    lastName: "Admin",
    email: "admin@erp.local",
    role: roles.ADMIN,
    department: humanResources,
    jobTitle: "System Administrator",
  });

  const hr = await upsertEmployee({
    firstName: "Hannah",
    lastName: "HR",
    email: "hr@erp.local",
    role: roles.HR,
    department: humanResources,
    jobTitle: "HR Business Partner",
    manager: admin,
  });

  const engineeringManager = await upsertEmployee({
    firstName: "Musa",
    lastName: "Engineering",
    email: "manager.engineering@erp.local",
    role: roles.MANAGER,
    department: engineering,
    jobTitle: "Engineering Manager",
    manager: hr,
  });

  const financeManager = await upsertEmployee({
    firstName: "Ngozi",
    lastName: "Finance",
    email: "manager.finance@erp.local",
    role: roles.MANAGER,
    department: finance,
    jobTitle: "Finance Manager",
    manager: hr,
  });

  await upsertEmployee({
    firstName: "Ada",
    lastName: "Okafor",
    email: "employee1@erp.local",
    role: roles.EMPLOYEE,
    department: engineering,
    jobTitle: "Backend Engineer",
    manager: engineeringManager,
  });

  await upsertEmployee({
    firstName: "Tunde",
    lastName: "Balogun",
    email: "employee2@erp.local",
    role: roles.EMPLOYEE,
    department: engineering,
    jobTitle: "Frontend Engineer",
    manager: engineeringManager,
  });

  await upsertEmployee({
    firstName: "Maryam",
    lastName: "Sani",
    email: "employee3@erp.local",
    role: roles.EMPLOYEE,
    department: finance,
    jobTitle: "Accountant",
    manager: financeManager,
  });

  await upsertEmployee({
    firstName: "Chinedu",
    lastName: "Eze",
    email: "employee4@erp.local",
    role: roles.EMPLOYEE,
    department: finance,
    jobTitle: "Payroll Analyst",
    manager: financeManager,
  });

  await upsertEmployee({
    firstName: "Bisi",
    lastName: "Adebayo",
    email: "employee5@erp.local",
    role: roles.EMPLOYEE,
    department: engineering,
    jobTitle: "QA Analyst",
    manager: engineeringManager,
  });

  return employeeMap;
}

async function seedLeaveRequests(
  employees: Map<string, Employee>,
  leaveTypes: Map<string, LeaveType>,
) {
  const leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);
  const approvalRepository = AppDataSource.getRepository(Approval);

  async function upsertLeaveRequest(input: {
    employee: Employee;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    currentStage: ApprovalStage;
    approvals: Array<{
      approver: Employee;
      stage: ApprovalStage;
      decision: ApprovalDecision;
      comments: string;
    }>;
  }) {
    let leaveRequest = await leaveRequestRepository.findOne({
      where: {
        employee: { id: input.employee.id },
        leaveType: { id: input.leaveType.id },
        startDate: input.startDate,
      },
      relations: ["employee", "leaveType", "approvals"],
    });

    if (!leaveRequest) {
      leaveRequest = leaveRequestRepository.create({
        employee: input.employee,
        leaveType: input.leaveType,
        startDate: input.startDate,
      });
    }

    leaveRequest.endDate = input.endDate;
    leaveRequest.reason = input.reason;
    leaveRequest.status = input.status;
    leaveRequest.currentStage = input.currentStage;

    const savedLeaveRequest = await leaveRequestRepository.save(leaveRequest);

    await approvalRepository
      .createQueryBuilder()
      .delete()
      .where("leave_request_id = :id", { id: savedLeaveRequest.id })
      .execute();

    if (input.approvals.length) {
      await approvalRepository.save(
        input.approvals.map((approval) =>
          approvalRepository.create({
            leaveRequest: savedLeaveRequest,
            approver: approval.approver,
            stage: approval.stage,
            decision: approval.decision,
            comments: approval.comments,
          }),
        ),
      );
    }
  }

  const admin = employees.get("admin@erp.local")!;
  const hr = employees.get("hr@erp.local")!;
  const engineeringManager = employees.get("manager.engineering@erp.local")!;
  const financeManager = employees.get("manager.finance@erp.local")!;
  const employee1 = employees.get("employee1@erp.local")!;
  const employee2 = employees.get("employee2@erp.local")!;
  const employee3 = employees.get("employee3@erp.local")!;
  const employee4 = employees.get("employee4@erp.local")!;
  const employee5 = employees.get("employee5@erp.local")!;

  await upsertLeaveRequest({
    employee: employee1,
    leaveType: leaveTypes.get("Annual Leave")!,
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    reason: "Family vacation planned before the new release cycle.",
    status: LeaveStatus.PENDING,
    currentStage: ApprovalStage.MANAGER,
    approvals: [],
  });

  await upsertLeaveRequest({
    employee: employee2,
    leaveType: leaveTypes.get("Sick Leave")!,
    startDate: "2026-06-20",
    endDate: "2026-06-21",
    reason: "Medical appointment and recovery period.",
    status: LeaveStatus.PENDING,
    currentStage: ApprovalStage.HR,
    approvals: [
      {
        approver: engineeringManager,
        stage: ApprovalStage.MANAGER,
        decision: ApprovalDecision.APPROVED,
        comments: "Sprint coverage has been arranged.",
      },
    ],
  });

  await upsertLeaveRequest({
    employee: employee3,
    leaveType: leaveTypes.get("Annual Leave")!,
    startDate: "2026-08-10",
    endDate: "2026-08-15",
    reason: "Scheduled annual leave after finance close.",
    status: LeaveStatus.APPROVED,
    currentStage: ApprovalStage.COMPLETED,
    approvals: [
      {
        approver: financeManager,
        stage: ApprovalStage.MANAGER,
        decision: ApprovalDecision.APPROVED,
        comments: "No payroll reporting conflict.",
      },
      {
        approver: hr,
        stage: ApprovalStage.HR,
        decision: ApprovalDecision.APPROVED,
        comments: "Final approval recorded.",
      },
    ],
  });

  await upsertLeaveRequest({
    employee: employee4,
    leaveType: leaveTypes.get("Compassionate Leave")!,
    startDate: "2026-06-18",
    endDate: "2026-06-19",
    reason: "Urgent family support request.",
    status: LeaveStatus.REJECTED,
    currentStage: ApprovalStage.COMPLETED,
    approvals: [
      {
        approver: financeManager,
        stage: ApprovalStage.MANAGER,
        decision: ApprovalDecision.REJECTED,
        comments: "Critical payroll run coverage is unavailable.",
      },
    ],
  });

  await upsertLeaveRequest({
    employee: employee5,
    leaveType: leaveTypes.get("Maternity Leave")!,
    startDate: "2026-09-01",
    endDate: "2026-11-29",
    reason: "Planned maternity leave with handover schedule.",
    status: LeaveStatus.APPROVED,
    currentStage: ApprovalStage.COMPLETED,
    approvals: [
      {
        approver: engineeringManager,
        stage: ApprovalStage.MANAGER,
        decision: ApprovalDecision.APPROVED,
        comments: "QA ownership transfer is documented.",
      },
      {
        approver: admin,
        stage: ApprovalStage.HR,
        decision: ApprovalDecision.APPROVED,
        comments: "Approved on behalf of HR administration.",
      },
    ],
  });
}

async function runSeed() {
  await AppDataSource.initialize();

  try {
    const roles = await seedRoles();
    const departments = await seedDepartments();
    const leaveTypes = await seedLeaveTypes();
    const employees = await seedEmployees(roles, departments);
    await seedLeaveRequests(employees, leaveTypes);
    console.log("Seed data created or updated successfully.");
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
