import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Authenticate with email and password." })
  @ApiResponse({
    status: 201,
    description: "JWT access token and employee profile returned.",
  })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
