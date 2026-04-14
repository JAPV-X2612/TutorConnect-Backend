import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from 'svix';
import { UserEntity } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

interface SvixHeaders {
  'svix-id': string;
  'svix-timestamp': string;
  'svix-signature': string;
}

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async handleClerkWebhook(
    payload: Buffer,
    headers: SvixHeaders,
  ): Promise<{ received: true }> {
    const secret = process.env.CLERK_WEBHOOK_SECRET as string;
    const wh = new Webhook(secret);

    let event: any;
    try {
      event = wh.verify(payload, headers as any);
    } catch {
      throw new UnauthorizedException('Firma inválida');
    }

    if (event.type === 'user.created') {
      await this.createUserFromClerk(event.data); // TODO: Fix error
    }

    return { received: true };
  }

  private async createUserFromClerk(data: any): Promise<void> {
    const clerkId: string = data.id; // TODO: Fix error
    const primaryEmail: string =
      data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id, // TODO: Fix error
      )?.email_address ?? // TODO: Fix error
      data.email_addresses?.[0]?.email_address ?? // TODO: Fix error
      '';

    const existing = await this.userRepository.findOne({
      where: { clerkId },
    });
    if (existing) return;

    const fullName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || // TODO: Fix error
      primaryEmail;

    const user = this.userRepository.create({
      clerkId,
      email: primaryEmail,
      name: fullName,
      role: Role.APRENDIZ,
    });

    await this.userRepository.save(user);
  }
}
