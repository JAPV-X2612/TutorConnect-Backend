import { ApiProperty } from '@nestjs/swagger';

export class RecentReviewDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ example: 'Excelente profe!', nullable: true })
  comment: string | null;

  @ApiProperty({ example: 'Carlos Mendez' })
  learnerName: string;

  @ApiProperty({ example: 'Introducción a JavaScript' })
  subject: string;

  @ApiProperty({ example: '2026-05-10T15:00:00.000Z' })
  createdAt: Date;
}

export class TutorReviewSummaryDto {
  @ApiProperty({ example: 4.75 })
  averageRating: number;

  @ApiProperty({ example: 4 })
  totalReviews: number;

  @ApiProperty({ example: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 } })
  ratingDistribution: Record<string, number>;

  @ApiProperty({ type: [RecentReviewDto] })
  recentReviews: RecentReviewDto[];
}
