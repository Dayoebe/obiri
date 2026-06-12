import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ApprovalActionDto {
  @ApiPropertyOptional({
    description: "Optional approval or rejection comments.",
    example: "Coverage has been arranged for the requested dates.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}
