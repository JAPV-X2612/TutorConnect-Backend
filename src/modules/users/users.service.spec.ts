import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersDBService } from '../../database/dbservices/users.dbservice';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

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

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockUsersDBService = {
  repository: mockRepo,
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersDBService, useValue: mockUsersDBService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('persists and returns the new user', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_new',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.LEARNER,
      };
      const user = mockUser();
      mockRepo.create.mockReturnValue(user);
      mockRepo.save.mockResolvedValue(user);

      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(user);
    });

    it('throws ConflictException on duplicate constraint (pg code 23505)', async () => {
      mockRepo.create.mockReturnValue(mockUser());
      mockRepo.save.mockRejectedValue({ code: '23505' });

      await expect(service.create({} as CreateUserDto)).rejects.toThrow(ConflictException);
    });

    it('re-throws unexpected errors without wrapping', async () => {
      const unexpected = new Error('connection reset');
      mockRepo.create.mockReturnValue(mockUser());
      mockRepo.save.mockRejectedValue(unexpected);

      await expect(service.create({} as CreateUserDto)).rejects.toBe(unexpected);
    });
  });

  describe('findAll', () => {
    it('returns the array returned by the repository', async () => {
      const users = [mockUser(), mockUser()];
      mockRepo.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toBe(users);
    });
  });

  describe('findOne', () => {
    it('returns the user when found', async () => {
      const user = mockUser();
      mockRepo.findOne.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toBe(user);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('applies the dto fields and returns the saved entity', async () => {
      const user = mockUser();
      const dto: UpdateUserDto = { firstName: 'Updated' };
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.save.mockResolvedValue({ ...user, ...dto });

      const result = await service.update(1, dto);

      expect(result.firstName).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('calls repository.remove with the found entity', async () => {
      const user = mockUser();
      mockRepo.findOne.mockResolvedValue(user);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove(1);

      expect(mockRepo.remove).toHaveBeenCalledWith(user);
    });
  });

  describe('findByClerkId', () => {
    it('returns the user when found by clerk_id', async () => {
      const user = mockUser();
      mockRepo.findOne.mockResolvedValue(user);

      const result = await service.findByClerkId('user_abc123');

      expect(result).toBe(user);
    });

    it('returns null when no user matches the clerk_id', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findByClerkId('unknown');

      expect(result).toBeNull();
    });
  });
});
