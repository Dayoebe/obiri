import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../employees/employee.entity";
import { AuditLog } from "./audit-log.entity";

export interface AuditLogInput {
  entityName: string;
  entityId: string;
  userId?: string;
  action: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(input: AuditLogInput): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      entityName: input.entityName,
      entityId: input.entityId,
      user: input.userId ? ({ id: input.userId } as Employee) : null,
      action: input.action,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  findAll(): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      relations: ["user"],
      order: { timestamp: "DESC" },
    });
  }
}
