import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { LeaveRequest } from "../leave-requests/leave-request.entity";

@Entity("leave_types")
export class LeaveType {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "int", default: 0 })
  annualAllowanceDays: number;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.leaveType)
  leaveRequests: LeaveRequest[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
