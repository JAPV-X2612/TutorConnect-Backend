import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class RegisterTutorDto {
  @IsString()
  @IsNotEmpty({ message: 'nombre y apellido son requeridos' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'nombre y apellido son requeridos' })
  apellido: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
