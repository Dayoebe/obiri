import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Employee } from "../employees/employee.entity";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./jwt-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const employee = await this.employeeRepository
      .createQueryBuilder("employee")
      .addSelect("employee.passwordHash")
      .leftJoinAndSelect("employee.role", "role")
      .where("LOWER(employee.email) = LOWER(:email)", {
        email: loginDto.email,
      })
      .andWhere("employee.isActive = true")
      .getOne();

    if (!employee) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      employee.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload: JwtPayload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role.name,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: "Bearer",
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role.name,
      },
    };
  }
}
