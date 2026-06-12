import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty({
    description: "Unique department name.",
    example: "Engineering",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: "Short department description.",
    example: "Builds and maintains ERP products.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
