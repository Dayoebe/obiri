import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { Employee } from "../employees/employee.entity";
import { LeaveType } from "../leave-types/leave-type.entity";
import { Approval } from "./approval.entity";
import { LeaveRequest } from "./leave-request.entity";
import { LeaveRequestsController } from "./leave-requests.controller";
import { LeaveRequestsService } from "./leave-requests.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaveRequest, Approval, Employee, LeaveType]),
    AuditLogsModule,
  ],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
  exports: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
