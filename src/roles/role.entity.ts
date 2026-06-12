import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRole } from "../common/enums/user-role.enum";
import { Employee } from "../employees/employee.entity";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: UserRole, unique: true })
  name: UserRole;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Employee, (employee) => employee.role)
  employees: Employee[];
}
