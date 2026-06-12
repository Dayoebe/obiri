import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApprovalStage } from "../common/enums/approval-stage.enum";
import { LeaveStatus } from "../common/enums/leave-status.enum";
import { Employee } from "../employees/employee.entity";
import { LeaveType } from "../leave-types/leave-type.entity";
import { Approval } from "./approval.entity";

@Entity("leave_requests")
export class LeaveRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employee_id" })
  employee: Employee;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.leaveRequests, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "leave_type_id" })
  leaveType: LeaveType;

  @Column({ type: "date" })
  startDate: string;

  @Column({ type: "date" })
  endDate: string;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "enum", enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({
    type: "enum",
    enum: ApprovalStage,
    default: ApprovalStage.MANAGER,
  })
  currentStage: ApprovalStage;

  @OneToMany(() => Approval, (approval) => approval.leaveRequest)
  approvals: Approval[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
