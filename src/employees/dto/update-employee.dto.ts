import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import { CreateEmployeeDto } from "./create-employee.dto";

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({
    description: "New password. Omit to keep the current password.",
    example: "NewPassword123!",
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
