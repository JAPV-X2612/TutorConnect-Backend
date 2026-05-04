import { ApiProperty } from '@nestjs/swagger';

/**
 * Response payload returned after creating a review or fetching the review
 * associated with a booking.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-02
 */
export class ReviewResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'c57b9a0f-4e6e-4bcb-8f13-ef8a0a3a2b34' })
  bookingId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  rating: number;

  @ApiProperty({
    example: 'Excelente sesión, el tutor explicó con mucha claridad.',
    nullable: true,
  })
  comment: string | null;

  @ApiProperty({ example: '2026-05-02T18:23:11.000Z' })
  createdAt: Date;
}
