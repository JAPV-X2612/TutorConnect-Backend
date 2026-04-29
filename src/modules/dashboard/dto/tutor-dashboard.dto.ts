import { ApiProperty } from '@nestjs/swagger';

export class MetricasTutorDto {
  @ApiProperty({ example: 24 })
  total_sesiones: number;

  @ApiProperty({ example: 480000, description: 'Ingresos brutos en COP (antes de comisión TutorConnect)' })
  ingresos_totales: number;

  @ApiProperty({ example: 'COP' })
  moneda: string;

  @ApiProperty({ example: '2025-04', description: 'Período YYYY-MM del mes actual' })
  periodo: string;

  @ApiProperty({ example: 4.8, nullable: true, description: 'null si el tutor no tiene reseñas aún' })
  calificacion_promedio: number | null;

  @ApiProperty({ example: 18 })
  total_resenas: number;
}

export class ProximaSesionDto {
  @ApiProperty({ example: 'b47a9a0f-4e6e-4bcb-8f13-ef8a0a3a2a12' })
  id: string;

  @ApiProperty({ example: '2025-04-20T15:00:00.000Z' })
  fecha: Date;

  @ApiProperty({ example: 'Laura Martínez' })
  aprendiz_nombre: string;

  @ApiProperty({ example: 'Cálculo', nullable: true })
  materia: string | null;
}

export class TutorDashboardResponseDto {
  @ApiProperty({ type: MetricasTutorDto })
  metricas: MetricasTutorDto;

  @ApiProperty({ type: [ProximaSesionDto] })
  proximas_sesiones: ProximaSesionDto[];
}
