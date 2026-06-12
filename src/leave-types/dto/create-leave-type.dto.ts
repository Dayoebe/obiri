import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateLeaveTypeDto {
  @ApiProperty({
    description: "Unique leave type name.",
    example: "Annual Leave",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: "Leave policy description.",
    example: "Paid annual leave entitlement for confirmed employees.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description:
      "Annual allowance in days. Use 0 when entitlement is handled outside this module.",
    example: 20,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  annualAllowanceDays?: number;

  @ApiPropertyOptional({
    description: "Whether employees can currently request this leave type.",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
