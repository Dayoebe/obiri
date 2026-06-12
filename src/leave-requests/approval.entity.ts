import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ApprovalDecision } from "../common/enums/approval-decision.enum";
import { ApprovalStage } from "../common/enums/approval-stage.enum";
import { Employee } from "../employees/employee.entity";
import { LeaveRequest } from "./leave-request.entity";

@Entity("approvals")
export class Approval {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => LeaveRequest, (leaveRequest) => leaveRequest.approvals, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "leave_request_id" })
  leaveRequest: LeaveRequest;

  @ManyToOne(() => Employee, (employee) => employee.approvals, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "approver_id" })
  approver: Employee;

  @Column({ type: "enum", enum: ApprovalStage })
  stage: ApprovalStage;

  @Column({ type: "enum", enum: ApprovalDecision })
  decision: ApprovalDecision;

  @Column({ type: "text", nullable: true })
  comments?: string;

  @CreateDateColumn()
  createdAt: Date;
}
