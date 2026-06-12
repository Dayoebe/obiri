import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeesService } from "./employees.service";

@ApiTags("Employees")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create an employee. Admin only." })
  @ApiResponse({ status: 201, description: "Employee created." })
  create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.employeesService.create(createEmployeeDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "List employees." })
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "Get an employee by UUID." })
  @ApiParam({ name: "id", description: "Employee UUID." })
  findOne(@Param("id") id: string) {
    return this.employeesService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update an employee. Admin only." })
  @ApiParam({ name: "id", description: "Employee UUID." })
  update(
    @Param("id") id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.employeesService.update(id, updateEmployeeDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an employee. Admin only." })
  @ApiParam({ name: "id", description: "Employee UUID." })
  remove(
    @Param("id") id: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.employeesService.remove(id, currentUser);
  }
}
