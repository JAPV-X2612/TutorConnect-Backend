import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
  city: null,
  country: 'Colombia',
  organizationName: null,
  academicProgram: null,
  interests: null,
  currentSemester: null,
  specialties: null,
  experienceYears: null,
  isVerified: null,
  hourlyRate: null,
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
  createWithTransaction: jest.fn(),
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
        organizationName: 'Test University',
        interests: ['Mathematics'],
      };
      const user = mockUser();
      mockUsersDBService.createWithTransaction.mockResolvedValue(user);

      const result = await service.create(dto);

      expect(mockUsersDBService.createWithTransaction).toHaveBeenCalled();
      expect(result).toBe(user);
    });

    it('throws ConflictException on duplicate constraint (pg code 23505)', async () => {
      mockUsersDBService.createWithTransaction.mockRejectedValue({
        code: '23505',
      });

      const dto: CreateUserDto = {
        clerkId: 'user_dup',
        email: 'dup@example.com',
        firstName: 'Dup',
        lastName: 'User',
        role: UserRole.LEARNER,
        organizationName: 'Some University',
        interests: ['History'],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('re-throws unexpected errors without wrapping', async () => {
      const unexpected = new Error('connection reset');
      mockUsersDBService.createWithTransaction.mockRejectedValue(unexpected);

      const dto: CreateUserDto = {
        clerkId: 'user_err',
        email: 'err@example.com',
        firstName: 'Err',
        lastName: 'User',
        role: UserRole.LEARNER,
        organizationName: 'Some University',
        interests: ['Art'],
      };

      await expect(service.create(dto)).rejects.toBe(unexpected);
    });

    it('throws BadRequestException when learner omits interests', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_l',
        email: 'l@example.com',
        firstName: 'L',
        lastName: 'User',
        role: UserRole.LEARNER,
        organizationName: 'ECI',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when learner omits organizationName', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_l2',
        email: 'l2@example.com',
        firstName: 'L',
        lastName: 'User',
        role: UserRole.LEARNER,
        interests: ['Physics'],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when tutor omits specialties', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_t',
        email: 't@example.com',
        firstName: 'T',
        lastName: 'Tutor',
        role: UserRole.TUTOR,
        hourlyRate: 50000,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when tutor omits hourlyRate', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_t2',
        email: 't2@example.com',
        firstName: 'T',
        lastName: 'Tutor',
        role: UserRole.TUTOR,
        specialties: ['Calculus'],
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
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

  // ── New scenarios required by MOD-USR-002 task ────────────────────────────────

  describe('full profile success — learner with city, university and interests', () => {
    it('persists all extended profile fields for a learner', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_full',
        email: 'full@example.com',
        firstName: 'Ana',
        lastName: 'Gómez',
        role: UserRole.LEARNER,
        city: 'Bogotá',
        country: 'Colombia',
        organizationName: 'Escuela Colombiana de Ingeniería',
        program: 'Systems Engineering',
        interests: ['Mathematics', 'Physics'],
        currentSemester: 4,
      };

      const savedUser: UserEntity = {
        ...mockUser(),
        clerkId: dto.clerkId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        city: 'BOGOTÁ',
        country: 'Colombia',
        organizationName: 'ESCUELA COLOMBIANA DE INGENIERÍA',
        academicProgram: 'Systems Engineering',
        interests: ['Mathematics', 'Physics'],
        currentSemester: 4,
      };
      mockUsersDBService.createWithTransaction.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      const [callArg] = mockUsersDBService.createWithTransaction.mock.calls[0];
      expect(callArg.city).toBe('BOGOTÁ');
      expect(callArg.organizationName).toBe('ESCUELA COLOMBIANA DE INGENIERÍA');
      expect(callArg.interests).toEqual(['Mathematics', 'Physics']);
      expect(callArg.currentSemester).toBe(4);
      expect(result.city).toBe('BOGOTÁ');
      expect(result.interests).toEqual(['Mathematics', 'Physics']);
    });
  });

  describe('organisation filter — tutor registration without organisation', () => {
    it('allows a tutor to register without an organisationName', async () => {
      const dto: CreateUserDto = {
        clerkId: 'user_tutor_no_org',
        email: 'tutor@example.com',
        firstName: 'Carlos',
        lastName: 'Pérez',
        role: UserRole.TUTOR,
        specialties: ['Calculus', 'Linear Algebra'],
        hourlyRate: 60000,
        experienceYears: 3,
      };

      const savedUser: UserEntity = {
        ...mockUser(),
        role: UserRole.TUTOR,
        clerkId: dto.clerkId,
        organizationName: null,
        specialties: ['Calculus', 'Linear Algebra'],
        hourlyRate: 60000,
        experienceYears: 3,
      };
      mockUsersDBService.createWithTransaction.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      const [callArg] = mockUsersDBService.createWithTransaction.mock.calls[0];
      expect(callArg.organizationName).toBeNull();
      expect(result.specialties).toEqual(['Calculus', 'Linear Algebra']);
    });
  });

  describe('data integrity — updated_at changes on profile field modification', () => {
    it('returns an entity with a newer updatedAt after update', async () => {
      const original = mockUser();
      const originalTimestamp = new Date('2024-01-01T00:00:00Z');
      original.updatedAt = originalTimestamp;

      const updatedTimestamp = new Date('2024-06-01T12:00:00Z');
      const updatedUser: UserEntity = {
        ...original,
        firstName: 'Modified',
        updatedAt: updatedTimestamp,
      };

      mockRepo.findOne.mockResolvedValue(original);
      mockRepo.save.mockResolvedValue(updatedUser);

      const result = await service.update(1, { firstName: 'Modified' });

      expect(result.updatedAt.getTime()).toBeGreaterThan(
        originalTimestamp.getTime(),
      );
      expect(result.firstName).toBe('Modified');
    });
  });

  describe('constraint test — clerk_id remains the unique identifier', () => {
    it('throws ConflictException when creating a second user with the same clerk_id', async () => {
      mockUsersDBService.createWithTransaction.mockRejectedValue({
        code: '23505',
      });

      const dto: CreateUserDto = {
        clerkId: 'user_abc123',
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.LEARNER,
        organizationName: 'Some University',
        interests: ['Biology'],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('findByClerkId uses clerk_id as the lookup key across all operations', async () => {
      const user = mockUser();
      mockRepo.findOne.mockResolvedValue(user);

      await service.findByClerkId('user_abc123');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { clerkId: 'user_abc123' },
      });
    });
  });
});
