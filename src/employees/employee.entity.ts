import { Exclude } from "class-transformer";
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
import { AuditLog } from "../audit-logs/audit-log.entity";
import { Approval } from "../leave-requests/approval.entity";
import { LeaveRequest } from "../leave-requests/leave-request.entity";
import { Department } from "../departments/department.entity";
import { Role } from "../roles/role.entity";

@Entity("employees")
export class Employee {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Column({ select: false })
  passwordHash: string;

  @Column({ nullable: true })
  jobTitle?: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "department_id" })
  department?: Department | null;

  @ManyToOne(() => Employee, (employee) => employee.subordinates, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "manager_id" })
  manager?: Employee | null;

  @OneToMany(() => Employee, (employee) => employee.manager)
  subordinates: Employee[];

  @ManyToOne(() => Role, (role) => role.employees, {
    eager: true,
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => Approval, (approval) => approval.approver)
  approvals: Approval[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
