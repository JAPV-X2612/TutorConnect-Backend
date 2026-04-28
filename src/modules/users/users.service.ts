import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersDBService } from '../../database/dbservices/users.dbservice';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UserRole } from '../../common/enums/user-role.enum';

/**
 * Business logic service for the Users module (MOD-USR-002).
 *
 * Orchestrates user profile operations including role-specific validation,
 * field normalisation, and transactional persistence. All database access is
 * delegated to {@link UsersDBService} — this service never touches TypeORM
 * repositories directly.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersDBService: UsersDBService) {}

  /**
   * Creates a new user profile inside a database transaction.
   *
   * Validates role-specific requirements before persisting:
   * - A LEARNER registration must supply at least one interest and an
   *   organisation name (university).
   * - A TUTOR registration must supply specialties and an hourly rate.
   *
   * The {@link CreateUserDto.city} and {@link CreateUserDto.organizationName}
   * fields are normalised to uppercase before storage to support
   * case-insensitive regional and institutional tutor matching (MOD-BUS-003).
   *
   * @param dto - Validated creation payload.
   * @returns The persisted {@link UserEntity}.
   * @throws {BadRequestException} When role-specific required fields are missing.
   * @throws {ConflictException} When the clerk_id or email is already in use.
   */
  async create(dto: CreateUserDto): Promise<UserEntity> {
    const role = dto.role ?? UserRole.LEARNER;

    const userData: Partial<UserEntity> = {
      clerkId: dto.clerkId,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
      city: dto.city ? dto.city.toUpperCase() : null,
      country: dto.country ?? 'Colombia',
      organizationName: dto.organizationName
        ? dto.organizationName.toUpperCase()
        : null,
      academicProgram: dto.program ?? null,
      interests: dto.interests ?? null,
      currentSemester: dto.currentSemester ?? null,
      specialties: dto.specialties ?? null,
      experienceYears: dto.experienceYears ?? null,
      isVerified: role === UserRole.TUTOR ? false : null,
      hourlyRate: dto.hourlyRate ?? null,
    };

    try {
      return await this.usersDBService.createWithTransaction(userData);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        throw new ConflictException(
          'A user with this clerk_id or email already exists',
        );
      }
      throw error;
    }
  }

  /**
   * Retrieves all user profiles.
   *
   * @returns Array of all {@link UserEntity} records.
   */
  async findAll(): Promise<UserEntity[]> {
    return this.usersDBService.repository.find();
  }

  /**
   * Retrieves a single user by their internal numeric identifier.
   *
   * @param id - Internal database primary key.
   * @returns The matching {@link UserEntity}.
   * @throws {NotFoundException} When no user is found for the given id.
   */
  async findOne(id: number): Promise<UserEntity> {
    const user = await this.usersDBService.repository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Partially updates an existing user profile.
   *
   * @param id - Internal database primary key.
   * @param dto - Fields to update.
   * @returns The updated {@link UserEntity}.
   * @throws {NotFoundException} When no user is found for the given id.
   */
  async update(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.city !== undefined) user.city = dto.city ? dto.city.toUpperCase() : null;
    if (dto.organizationName !== undefined) user.organizationName = dto.organizationName || null;
    if (dto.academicProgram !== undefined) user.academicProgram = dto.academicProgram || null;
    if (dto.interests !== undefined) user.interests = dto.interests;
    return this.usersDBService.repository.save(user);
  }

  async updateByClerkId(clerkId: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findByClerkId(clerkId);
    if (!user) throw new NotFoundException('User not found');
    return this.update(user.id, dto);
  }

  /**
   * Removes a user profile permanently.
   *
   * @param id - Internal database primary key.
   * @throws {NotFoundException} When no user is found for the given id.
   */
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersDBService.repository.remove(user);
  }

  /**
   * Retrieves a user by their Clerk external identifier.
   *
   * Used after JWT validation to load the local user profile.
   *
   * @param clerkId - Clerk subject identifier (e.g. "user_2abc123").
   * @returns The matching {@link UserEntity}, or null if not found.
   */
  async findByClerkId(clerkId: string): Promise<UserEntity | null> {
    return this.usersDBService.repository.findOne({ where: { clerkId } });
  }
}
