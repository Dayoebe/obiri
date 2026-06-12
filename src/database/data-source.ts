import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { AuditLog } from "../audit-logs/audit-log.entity";
import { Department } from "../departments/department.entity";
import { Employee } from "../employees/employee.entity";
import { Approval } from "../leave-requests/approval.entity";
import { LeaveRequest } from "../leave-requests/leave-request.entity";
import { LeaveType } from "../leave-types/leave-type.entity";
import { Role } from "../roles/role.entity";

config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? "leave_user",
  password: process.env.DB_PASSWORD ?? "leave_password",
  database: process.env.DB_DATABASE ?? "leave_management",
  synchronize: process.env.TYPEORM_SYNC === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  entities: [
    Role,
    Department,
    Employee,
    LeaveType,
    LeaveRequest,
    Approval,
    AuditLog,
  ],
});
