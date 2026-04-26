import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsIn, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subject: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

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
}
