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

interface ClerkUnsafeMetadata {
  role?: string;
  [key: string]: unknown;
}

interface ClerkUserCreatedData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string;
  email_addresses: ClerkEmailAddress[];
  unsafe_metadata?: ClerkUnsafeMetadata;
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
      event = wh.verify(
        payload,
        headers as unknown as Record<string, string>,
      ) as ClerkWebhookEvent;
    } catch {
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    if (event.type === 'user.created') {
      await this.createUserFromClerk(event.data);
    }

    if (event.type === 'user.updated') {
      await this.syncRoleFromMetadata(event.data);
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

    const byClerkId = await this.userRepository.findOne({ where: { clerkId } });
    if (byClerkId) {
      this.logger.debug(
        `User with clerk_id=${clerkId} already exists — skipping creation`,
      );
      return;
    }

    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
        ?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      '';

    const firstName = data.first_name ?? '';
    const lastName = data.last_name ?? '';

    const rawRole = data.unsafe_metadata?.role?.toUpperCase();
    const role =
      rawRole === UserRole.TUTOR ? UserRole.TUTOR : UserRole.LEARNER;

    this.logger.log(
      `[user.created] clerk_id=${clerkId} | email=${primaryEmail} | ` +
        `unsafe_metadata.role="${data.unsafe_metadata?.role ?? '(none)'}" | ` +
        `resolved_role=${role}` +
        (role === UserRole.LEARNER && !data.unsafe_metadata?.role
          ? ' ⚠ no role in metadata — will be corrected by POST /tutors/register or user.updated if this is a tutor'
          : ''),
    );

    // If a record with the same email already exists (e.g. created by a prior
    // registration attempt), update its clerkId instead of inserting a duplicate.
    if (primaryEmail) {
      const byEmail = await this.userRepository.findOne({
        where: { email: primaryEmail },
      });
      if (byEmail) {
        byEmail.clerkId = clerkId;
        byEmail.firstName = firstName || byEmail.firstName;
        byEmail.lastName = lastName || byEmail.lastName;
        if (role === UserRole.TUTOR) byEmail.role = role;
        await this.userRepository.save(byEmail);
        this.logger.log(
          `[user.created] Re-linked existing profile clerk_id=${clerkId} | role=${byEmail.role} (email=${primaryEmail})`,
        );
        return;
      }
    }

    const user = this.userRepository.create({
      clerkId,
      email: primaryEmail,
      firstName,
      lastName,
      role,
    });

    await this.userRepository.save(user);
    this.logger.log(
      `[user.created] New platform profile created | clerk_id=${clerkId} | role=${role}`,
    );
  }

  /**
   * Handles `user.updated` events.
   *
   * When the frontend sets `unsafeMetadata.role = "TUTOR"` during the OAuth
   * sign-up flow, Clerk fires this event. We use it to correct the role that
   * `user.created` may have defaulted to LEARNER due to the race condition
   * between the webhook delivery and the frontend metadata update.
   *
   * @param data - Raw Clerk user object from the webhook event.
   */
  private async syncRoleFromMetadata(data: ClerkUserCreatedData): Promise<void> {
    const rawRole = data.unsafe_metadata?.role?.toUpperCase();

    this.logger.debug(
      `[user.updated] clerk_id=${data.id} | unsafe_metadata.role="${data.unsafe_metadata?.role ?? '(none)'}"`,
    );

    if (rawRole !== UserRole.TUTOR) return;

    const user = await this.userRepository.findOne({ where: { clerkId: data.id } });
    if (!user) {
      this.logger.warn(
        `[user.updated] No platform profile found for clerk_id=${data.id} — skipping role sync`,
      );
      return;
    }

    if (user.role === UserRole.TUTOR) {
      this.logger.debug(
        `[user.updated] clerk_id=${data.id} already has role=TUTOR — no action needed`,
      );
      return;
    }

    user.role = UserRole.TUTOR;
    await this.userRepository.save(user);
    this.logger.log(
      `[user.updated] Role corrected LEARNER → TUTOR for clerk_id=${data.id}`,
    );
  }
}
