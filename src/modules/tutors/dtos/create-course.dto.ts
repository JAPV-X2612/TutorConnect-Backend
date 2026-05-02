import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsIn,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export class ScheduleSlotDto {
  @IsString()
  @IsIn(DAYS)
  day: (typeof DAYS)[number];

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;
}

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  objectives?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;

  @IsNumber()
  @Min(1)
  price: number;

  @IsOptional()
  @IsNumber()
  @IsIn([30, 60, 90])
  duration?: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Presencial', 'Virtual', 'Ambas'])
  modalidad: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  academicLevel?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];
}
