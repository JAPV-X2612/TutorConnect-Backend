import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { BookingsService } from './bookings.service';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';

class CreateBookingDto {
  @IsUUID()
  courseId: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class RespondBookingDto {
  @IsString()
  status: 'confirmed' | 'cancelled';
}

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── POST /bookings ─────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  async create(@Body() dto: CreateBookingDto, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.bookingsService.createBooking(clerk_id, dto.courseId, dto.scheduledAt, dto.notes);
  }

  // ── GET /bookings/me (learner's bookings) ──────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getLearnerBookings(@Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.bookingsService.getLearnerBookings(clerk_id);
  }

  // ── GET /bookings/tutor (tutor's incoming bookings) ────────────────────────

  @Get('tutor')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getTutorBookings(@Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.bookingsService.getTutorBookings(clerk_id);
  }

  // ── PATCH /bookings/:id/status (tutor accepts / rejects) ──────────────────

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async respondToBooking(
    @Param('id') id: string,
    @Body() dto: RespondBookingDto,
    @Req() req: Request,
  ) {
    const { clerk_id } = (req as any).user;
    return this.bookingsService.respondToBooking(id, clerk_id, dto.status);
  }

  // ── DELETE /bookings/:id (learner cancels) ────────────────────────────────

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async cancelBooking(@Param('id') id: string, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.bookingsService.cancelBooking(id, clerk_id);
  }
}
