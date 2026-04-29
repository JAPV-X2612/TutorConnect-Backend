import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { MessagingService } from './services/messaging.service';
import { CreateChannelDto } from './dto/requests/create-channel.dto';

/**
 * REST controller for MOD-MSG-005 (Messaging).
 *
 * Handles channel management and history retrieval. Real-time message delivery
 * is handled by {@link MessagingGateway}.
 *
 * @author TutorConnect Team
 */
@Controller('messaging')
@UseGuards(ClerkJwtGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * GET /messaging/channels
   * Returns all channels the authenticated user participates in.
   */
  @Get('channels')
  @HttpCode(HttpStatus.OK)
  async listChannels(@Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.messagingService.listChannels(clerk_id);
  }

  /**
   * POST /messaging/channels
   * Creates or retrieves the channel between the caller and `otherClerkId`.
   */
  @Post('channels')
  @HttpCode(HttpStatus.OK)
  async getOrCreateChannel(@Req() req: Request, @Body() dto: CreateChannelDto) {
    const { clerk_id } = (req as any).user;
    return this.messagingService.getOrCreateChannel(
      clerk_id,
      dto.otherClerkId,
      dto.courseId,
    );
  }

  /**
   * GET /messaging/channels/:id/messages
   * Returns paginated message history for a channel.
   */
  @Get('channels/:id/messages')
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Req() req: Request,
    @Param('id', ParseIntPipe) channelId: number,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { clerk_id } = (req as any).user;
    return this.messagingService.getHistory(
      channelId,
      clerk_id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }
}
