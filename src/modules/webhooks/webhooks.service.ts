import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from 'svix';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUserCreatedData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string;
  email_addresses: ClerkEmailAddress[];
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserCreatedData;
}

/**
 * Handles incoming Clerk webhook events and synchronises the platform database.
 *
 * When a new identity is created in Clerk the `user.created` event fires this
 * service, which upserts the corresponding {@link UserEntity} in PostgreSQL.
 * Webhook authenticity is verified using the Svix library.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Verifies the Svix signature and dispatches the event to the appropriate handler.
   *
   * @param payload - Raw request body bytes (must be unparsed).
   * @param headers - Svix verification headers from the incoming request.
   * @returns `{ received: true }` on success.
   * @throws {UnauthorizedException} When the Svix signature is invalid.
   */
  async handleClerkWebhook(
    payload: Buffer,
    headers: SvixHeaders,
  ): Promise<{ received: true }> {
    const secret = process.env.CLERK_WEBHOOK_SECRET as string;
    const wh = new Webhook(secret);

    let event: ClerkWebhookEvent;
    try {
      event = wh.verify(payload, headers as unknown as Record<string, string>) as ClerkWebhookEvent;
    } catch {
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    if (event.type === 'user.created') {
      await this.createUserFromClerk(event.data);
    }

    return { received: true };
  }

  /**
   * Creates a local user profile from the Clerk `user.created` event payload.
   *
   * Skips creation if a profile for the given Clerk id already exists (idempotent).
   *
   * @param data - Raw Clerk user object from the webhook event.
   */
  private async createUserFromClerk(data: ClerkUserCreatedData): Promise<void> {
    const clerkId = data.id;

    const existing = await this.userRepository.findOne({ where: { clerkId } });
    if (existing) {
      this.logger.debug(`User with clerk_id=${clerkId} already exists — skipping creation`);
      return;
    }

    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      '';

    const firstName = data.first_name ?? '';
    const lastName = data.last_name ?? '';

    const user = this.userRepository.create({
      clerkId,
      email: primaryEmail,
      firstName,
      lastName,
      role: UserRole.LEARNER,
    });

    await this.userRepository.save(user);
    this.logger.log(`Platform profile created for clerk_id=${clerkId}`);
  }
}
