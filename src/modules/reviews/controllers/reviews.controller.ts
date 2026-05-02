import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClerkJwtGuard, ClerkRequestUser } from '../../auth/clerk-jwt.guard';
import { ReviewsService } from '../services/reviews.service';
import { CreateReviewDto } from '../dtos/requests/create-review.dto';
import { ReviewResponseDto } from '../dtos/responses/review.response.dto';

type AuthenticatedRequest = Request & { user: ClerkRequestUser };

/**
 * REST endpoints for learner-submitted session reviews.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-02
 */
@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ── POST /reviews ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  @ApiOperation({ summary: 'Submit a rating for a completed booking.' })
  async create(
    @Body() dto: CreateReviewDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReviewResponseDto> {
    const { clerk_id } = req.user;
    return this.reviewsService.createReview(clerk_id, dto);
  }

  // ── GET /reviews/booking/:bookingId ───────────────────────────────────────

  @Get('booking/:bookingId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  @ApiOperation({
    summary:
      "Fetch the authenticated learner's review for a booking, if any exists.",
  })
  async getForBooking(
    @Param('bookingId', new ParseUUIDPipe()) bookingId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReviewResponseDto | null> {
    const { clerk_id } = req.user;
    return this.reviewsService.getReviewForBooking(clerk_id, bookingId);
  }
}
