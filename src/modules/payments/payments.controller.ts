import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dtos/requests/initiate-payment.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── GET /api/payments/bookings/:id/summary ─────────────────────────────────
  // Learner views payment breakdown before entering card details.
  // Starts the 10-minute auto-cancel timer for this booking.

  @Get('bookings/:id/summary')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getBookingSummary(@Param('id') id: string, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.paymentsService.getBookingSummary(id, clerk_id);
  }

  // ── POST /api/payments/bookings/:id/pay ────────────────────────────────────
  // Learner submits mock card data to confirm payment.
  // On success: booking → confirmed, tutor notified via WebSocket.
  // On failure: booking stays pending, error details returned.

  @Post('bookings/:id/pay')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  async processPayment(
    @Param('id') id: string,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
  ) {
    const { clerk_id } = (req as any).user;
    return this.paymentsService.processPayment(id, clerk_id, dto);
  }

  // ── GET /api/payments/tutor/history ────────────────────────────────────────
  // Tutor views payment history with optional date range filter.
  // Returns per-session breakdown (gross, commission 15%, net) and
  // monthly + filtered totals.
  //
  // Query params:
  //   from  ISO date string  e.g. 2025-01-01
  //   to    ISO date string  e.g. 2025-03-31

  @Get('tutor/history')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getTutorHistory(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { clerk_id } = (req as any).user;
    return this.paymentsService.getTutorPaymentHistory(clerk_id, from, to);
  }
}
