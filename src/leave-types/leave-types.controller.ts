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
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CreateLeaveTypeDto } from "./dto/create-leave-type.dto";
import { UpdateLeaveTypeDto } from "./dto/update-leave-type.dto";
import { LeaveTypesService } from "./leave-types.service";

@ApiTags("Leave Types")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leave-types")
export class LeaveTypesController {
  constructor(private readonly leaveTypesService: LeaveTypesService) {}

  @Post()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: "Create a leave type. HR/admin only." })
  @ApiResponse({ status: 201, description: "Leave type created." })
  create(@Body() createLeaveTypeDto: CreateLeaveTypeDto) {
    return this.leaveTypesService.create(createLeaveTypeDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "List leave types." })
  findAll() {
    return this.leaveTypesService.findAll();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({ summary: "Get a leave type by UUID." })
  @ApiParam({ name: "id", description: "Leave type UUID." })
  findOne(@Param("id") id: string) {
    return this.leaveTypesService.findOne(id);
  }

  @Put(":id")
  @Roles(UserRole.HR)
  @ApiOperation({ summary: "Update a leave type. HR/admin only." })
  @ApiParam({ name: "id", description: "Leave type UUID." })
  update(
    @Param("id") id: string,
    @Body() updateLeaveTypeDto: UpdateLeaveTypeDto,
  ) {
    return this.leaveTypesService.update(id, updateLeaveTypeDto);
  }

  @Delete(":id")
  @Roles(UserRole.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a leave type. HR/admin only." })
  @ApiParam({ name: "id", description: "Leave type UUID." })
  remove(@Param("id") id: string) {
    return this.leaveTypesService.remove(id);
  }
}
