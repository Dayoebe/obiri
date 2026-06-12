import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { Department } from "./department.entity";
import { DepartmentsController } from "./departments.controller";
import { DepartmentsService } from "./departments.service";

@Module({
  imports: [TypeOrmModule.forFeature([Department]), AuditLogsModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
