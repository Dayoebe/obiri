import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateLeaveRequestDto {
  @ApiProperty({
    description: "Leave type UUID.",
    example: "d165de3c-20be-4eaa-8a58-670f27f83fd4",
  })
  @IsUUID()
  leaveTypeId: string;

  @ApiProperty({
    description: "Leave start date in ISO-8601 date format.",
    example: "2026-07-01",
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description:
      "Leave end date in ISO-8601 date format. Must not be before startDate.",
    example: "2026-07-05",
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: "Reason for the leave request.",
    example: "Family vacation planned in advance.",
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;
}
