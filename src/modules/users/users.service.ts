import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersDBService } from '../../database/dbservices/users.dbservice';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

/**
 * Business logic service for the Users module (MOD-USR-002).
 *
 * Orchestrates user profile operations. All database persistence is delegated
 * to {@link UsersDBService} — this service never touches TypeORM repositories
 * directly.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersDBService: UsersDBService) {}

  /**
   * Creates a new user profile in the database.
   *
   * @param dto - Validated creation payload.
   * @returns The persisted {@link UserEntity}.
   * @throws {ConflictException} When the clerk_id or email is already in use.
   */
  async create(dto: CreateUserDto): Promise<UserEntity> {
    try {
      const user = this.usersDBService.repository.create(dto);
      return await this.usersDBService.repository.save(user);
    } catch (error: unknown) {
      const pgError = error as { code?: string };
      if (pgError?.code === '23505') {
        throw new ConflictException('A user with this clerk_id or email already exists');
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
    const user = await this.usersDBService.repository.findOne({ where: { id } });
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
    Object.assign(user, dto);
    return this.usersDBService.repository.save(user);
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
