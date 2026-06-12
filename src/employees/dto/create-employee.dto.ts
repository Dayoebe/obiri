import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { UserRole } from "../../common/enums/user-role.enum";

export class CreateEmployeeDto {
  @ApiProperty({
    description: "Employee first name.",
    example: "Ada",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName: string;

  @ApiProperty({
    description: "Employee last name.",
    example: "Okafor",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName: string;

  @ApiProperty({
    description: "Unique employee email address.",
    example: "ada.okafor@erp.local",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Temporary or permanent password for the employee.",
    example: "Password123!",
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: "Employee job title.",
    example: "Backend Engineer",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: "Whether the employee can authenticate and use the system.",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Department UUID to assign the employee to.",
    example: "8a3b9835-1f43-4e9e-8d80-e6700f3935d7",
  })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({
    description: "Manager employee UUID for the employee reporting line.",
    example: "0cd2a864-0d0a-40c1-b159-d3bcfc875c0d",
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    description: "Role assigned to the employee.",
    enum: UserRole,
    example: UserRole.EMPLOYEE,
    default: UserRole.EMPLOYEE,
  })
  @IsOptional()
  @IsEnum(UserRole)
  roleName?: UserRole;
}
