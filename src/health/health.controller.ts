import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DataSource } from "typeorm";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: "Check API and database readiness." })
  async check() {
    try {
      await this.dataSource.query("SELECT 1");

      return {
        status: "ok",
        service: "obiri-leave-management",
        database: "reachable",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        service: "obiri-leave-management",
        database: "unreachable",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
