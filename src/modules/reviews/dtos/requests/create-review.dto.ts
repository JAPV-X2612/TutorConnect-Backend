import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Request payload for a learner submitting a rating for a completed booking.
 *
 * Business rules enforced at the service layer:
 * - The booking referenced by {@link bookingId} must belong to the authenticated
 *   learner and must be in {@code 'completed'} status.
 * - Only one review per booking per learner is allowed.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-02
 */
export class CreateReviewDto {
  @ApiProperty({
    description: 'UUID of the completed booking being reviewed.',
    example: 'c57b9a0f-4e6e-4bcb-8f13-ef8a0a3a2b34',
  })
  @IsUUID()
  @Expose()
  bookingId: string;

  @ApiProperty({
    description: 'Integer rating on a 1-5 scale.',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Expose()
  rating: number;

  @ApiProperty({
    description: 'Optional free-text comment (max 1000 characters).',
    example: 'Excelente sesión, el tutor explicó con mucha claridad.',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Expose()
  comment?: string;
}
