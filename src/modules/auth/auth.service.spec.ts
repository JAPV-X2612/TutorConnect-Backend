import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { UserEntity } from '../users/entities/user.entity';

const mockUser = (): UserEntity => ({
  id: 1,
  clerkId: 'user_abc123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.LEARNER,
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  learnerPreferences: [],
});

const mockUsersService = {
  findByClerkId: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validateUser', () => {
    it('returns the user entity when a matching profile exists', async () => {
      const user = mockUser();
      mockUsersService.findByClerkId.mockResolvedValue(user);

      const result = await service.validateUser(user.clerkId);

      expect(result).toBe(user);
      expect(mockUsersService.findByClerkId).toHaveBeenCalledWith(user.clerkId);
    });

    it('throws UnauthorizedException when no profile is found', async () => {
      mockUsersService.findByClerkId.mockResolvedValue(null);

      await expect(service.validateUser('unknown_clerk_id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('delegates to validateUser and returns the entity', async () => {
      const user = mockUser();
      mockUsersService.findByClerkId.mockResolvedValue(user);

      const result = await service.getProfile(user.clerkId);

      expect(result).toBe(user);
    });

    it('propagates UnauthorizedException when user is not found', async () => {
      mockUsersService.findByClerkId.mockResolvedValue(null);

      await expect(service.getProfile('ghost_id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
