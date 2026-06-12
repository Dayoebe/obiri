import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { Department } from "../departments/department.entity";
import { Role } from "../roles/role.entity";
import { Employee } from "./employee.entity";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Department, Role]),
    AuditLogsModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
