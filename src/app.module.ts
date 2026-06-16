import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogsModule } from "./audit-logs/audit-logs.module";
import { AuthModule } from "./auth/auth.module";
import { DepartmentsModule } from "./departments/departments.module";
import { EmployeesModule } from "./employees/employees.module";
import { HealthModule } from "./health/health.module";
import { LeaveRequestsModule } from "./leave-requests/leave-requests.module";
import { LeaveTypesModule } from "./leave-types/leave-types.module";
import { RolesModule } from "./roles/roles.module";
import { WebModule } from "./web/web.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST", "localhost"),
        port: Number(configService.get<string>("DB_PORT", "5432")),
        username: configService.get<string>("DB_USERNAME", "leave_user"),
        password: configService.get<string>("DB_PASSWORD", "leave_password"),
        database: configService.get<string>("DB_DATABASE", "leave_management"),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>("TYPEORM_SYNC", "false") === "true",
        logging:
          configService.get<string>("TYPEORM_LOGGING", "false") === "true",
      }),
    }),
    RolesModule,
    AuthModule,
    HealthModule,
    DepartmentsModule,
    EmployeesModule,
    LeaveTypesModule,
    LeaveRequestsModule,
    AuditLogsModule,
    WebModule,
  ],
})
export class AppModule {}
