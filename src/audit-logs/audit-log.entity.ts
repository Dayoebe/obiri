import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "../employees/employee.entity";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  entityName: string;

  @Column()
  entityId: string;

  @ManyToOne(() => Employee, (employee) => employee.auditLogs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "user_id" })
  user?: Employee | null;

  @Column()
  action: string;

  @Column({ type: "jsonb", nullable: true })
  oldValues?: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  newValues?: Record<string, unknown> | null;

  @CreateDateColumn()
  timestamp: Date;
}
