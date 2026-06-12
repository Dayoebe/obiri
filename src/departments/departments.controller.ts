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
import { DepartmentsService } from "./departments.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";

@ApiTags("Departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("departments")
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a department. Admin only." })
  @ApiResponse({ status: 201, description: "Department created." })
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.departmentsService.create(createDepartmentDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "List departments." })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "Get a department by UUID." })
  @ApiParam({ name: "id", description: "Department UUID." })
  findOne(@Param("id") id: string) {
    return this.departmentsService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update a department. Admin only." })
  @ApiParam({ name: "id", description: "Department UUID." })
  update(
    @Param("id") id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto, currentUser);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a department. Admin only." })
  @ApiParam({ name: "id", description: "Department UUID." })
  remove(
    @Param("id") id: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.departmentsService.remove(id, currentUser);
  }
}
