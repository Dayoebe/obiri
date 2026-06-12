import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Employee email address used as the login identifier.",
    example: "employee1@erp.local",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Employee password.",
    example: "Password123!",
  })
  @IsString()
  @MinLength(8)
  password: string;
}
