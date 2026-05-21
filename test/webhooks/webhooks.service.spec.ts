import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { WebhooksService } from '../../src/modules/webhooks/webhooks.service';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { UserRole } from '../../src/common/enums/user-role.enum';

// ── Mock svix before imports resolve ─────────────────────────────────────────
jest.mock('svix', () => ({
  Webhook: jest.fn().mockImplementation(() => ({
    verify: jest.fn().mockImplementation((payload: Buffer) => JSON.parse(payload.toString())),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SVIX_HEADERS = {
  'svix-id': 'msg_1',
  'svix-timestamp': String(Math.floor(Date.now() / 1000)),
  'svix-signature': 'v1,fakesig',
};

function makePayload(event: object): Buffer {
  return Buffer.from(JSON.stringify(event));
}

function createdEvent(clerkId: string, role?: string) {
  return {
    type: 'user.created',
    data: {
      id: clerkId,
      first_name: 'Test',
      last_name: 'User',
      primary_email_address_id: 'e1',
      email_addresses: [{ id: 'e1', email_address: 'test@example.com' }],
      unsafe_metadata: role ? { role } : {},
    },
  };
}

function updatedEvent(clerkId: string, role?: string) {
  return {
    type: 'user.updated',
    data: {
      id: clerkId,
      first_name: 'Test',
      last_name: 'User',
      primary_email_address_id: 'e1',
      email_addresses: [{ id: 'e1', email_address: 'test@example.com' }],
      unsafe_metadata: role ? { role } : {},
    },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('WebhooksService', () => {
  let service: WebhooksService;
  let userRepo: Record<string, jest.Mock>;
  const originalSecret = process.env.CLERK_WEBHOOK_SECRET;

  beforeEach(async () => {
    process.env.CLERK_WEBHOOK_SECRET = 'test_webhook_secret';

    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env.CLERK_WEBHOOK_SECRET = originalSecret;
  });

  // ── handleClerkWebhook ────────────────────────────────────────────────────

  describe('handleClerkWebhook', () => {
    it('throws UnauthorizedException when CLERK_WEBHOOK_SECRET is not set', async () => {
      delete process.env.CLERK_WEBHOOK_SECRET;
      await expect(
        service.handleClerkWebhook(makePayload({ type: 'user.created' }), SVIX_HEADERS),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns { received: true } for an unknown event type', async () => {
      const result = await service.handleClerkWebhook(
        makePayload({ type: 'session.created', data: {} }),
        SVIX_HEADERS,
      );
      expect(result).toEqual({ received: true });
    });

    it('creates a new LEARNER user when user.created fires and user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 1, clerkId: 'new_clerk', role: UserRole.LEARNER };
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      const result = await service.handleClerkWebhook(
        makePayload(createdEvent('new_clerk')),
        SVIX_HEADERS,
      );

      expect(result).toEqual({ received: true });
      expect(userRepo.save).toHaveBeenCalledTimes(1);
    });

    it('creates a TUTOR user when user.created includes role=TUTOR in metadata', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const newUser = { id: 2, clerkId: 'new_tutor', role: UserRole.TUTOR };
      userRepo.create.mockReturnValue(newUser);
      userRepo.save.mockResolvedValue(newUser);

      await service.handleClerkWebhook(
        makePayload(createdEvent('new_tutor', 'TUTOR')),
        SVIX_HEADERS,
      );

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.TUTOR }),
      );
    });

    it('skips user creation when user already exists by clerkId', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, clerkId: 'existing_clerk' });

      await service.handleClerkWebhook(
        makePayload(createdEvent('existing_clerk')),
        SVIX_HEADERS,
      );

      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('re-links existing user by email when clerkId is not found', async () => {
      const existingByEmail = { id: 5, clerkId: 'old_clerk', role: UserRole.LEARNER, firstName: 'Old', lastName: 'User' };
      // First call: findOne by clerkId → null; second call: findOne by email → existing user
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingByEmail);
      userRepo.save.mockResolvedValue({ ...existingByEmail, clerkId: 'new_clerk_relink' });

      await service.handleClerkWebhook(
        makePayload(createdEvent('new_clerk_relink')),
        SVIX_HEADERS,
      );

      expect(userRepo.save).toHaveBeenCalledTimes(1);
    });

    it('updates user role to TUTOR on user.updated when metadata contains TUTOR', async () => {
      const existing = { id: 3, clerkId: 'up_clerk', role: UserRole.LEARNER };
      userRepo.findOne.mockResolvedValue(existing);
      userRepo.save.mockResolvedValue({ ...existing, role: UserRole.TUTOR });

      await service.handleClerkWebhook(
        makePayload(updatedEvent('up_clerk', 'TUTOR')),
        SVIX_HEADERS,
      );

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.TUTOR }),
      );
    });

    it('does nothing on user.updated when role in metadata is not TUTOR', async () => {
      await service.handleClerkWebhook(
        makePayload(updatedEvent('up_clerk', 'LEARNER')),
        SVIX_HEADERS,
      );
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
