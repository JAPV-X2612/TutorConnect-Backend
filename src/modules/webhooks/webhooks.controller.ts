import { Controller, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('clerk')
  @HttpCode(HttpStatus.OK)
  async handleClerk(@Req() req: Request): Promise<{ received: true }> {
    return this.webhooksService.handleClerkWebhook(req.body as Buffer, {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    });
  }
}
