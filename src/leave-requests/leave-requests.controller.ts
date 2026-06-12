import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
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
import { ApprovalActionDto } from "./dto/approval-action.dto";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { LeaveRequestsService } from "./leave-requests.service";

@ApiTags("Leave Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leave-requests")
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: "Submit a leave request for the authenticated employee.",
  })
  @ApiResponse({ status: 201, description: "Leave request submitted." })
  create(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.leaveRequestsService.create(createLeaveRequestDto, currentUser);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary:
      "List leave requests visible to the current user based on their role.",
  })
  findAll(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.leaveRequestsService.findAll(currentUser);
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.EMPLOYEE)
  @ApiOperation({
    summary: "Get a leave request by UUID if visible to the current user.",
  })
  @ApiParam({ name: "id", description: "Leave request UUID." })
  findOne(
    @Param("id") id: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.leaveRequestsService.findOne(id, currentUser);
  }

  @Post(":id/approve")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "Approve the current workflow stage." })
  @ApiParam({ name: "id", description: "Leave request UUID." })
  approve(
    @Param("id") id: string,
    @Body() approvalActionDto: ApprovalActionDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.leaveRequestsService.approve(
      id,
      currentUser,
      approvalActionDto,
    );
  }

  @Post(":id/reject")
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @ApiOperation({ summary: "Reject the current workflow stage." })
  @ApiParam({ name: "id", description: "Leave request UUID." })
  reject(
    @Param("id") id: string,
    @Body() approvalActionDto: ApprovalActionDto,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.leaveRequestsService.reject(id, currentUser, approvalActionDto);
  }
}
