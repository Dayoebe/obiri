import * as bcrypt from "bcryptjs";
import { UserRole } from "../common/enums/user-role.enum";
import { Department } from "../departments/department.entity";
import { Employee } from "../employees/employee.entity";
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

  for (const leaveTypeData of leaveTypes) {
    const existingLeaveType = await leaveTypeRepository.findOneBy({
      name: leaveTypeData.name,
    });
    if (!existingLeaveType) {
      await leaveTypeRepository.save(
        leaveTypeRepository.create({
          ...leaveTypeData,
          isActive: true,
        }),
      );
    }
  }
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

    return employeeRepository.save(employee);
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
}

async function runSeed() {
  await AppDataSource.initialize();

  try {
    const roles = await seedRoles();
    const departments = await seedDepartments();
    await seedLeaveTypes();
    await seedEmployees(roles, departments);
    console.log("Seed data created or updated successfully.");
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
