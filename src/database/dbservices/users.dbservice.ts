import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

/**
 * Data-access service for the {@link UserEntity} table.
 *
 * Exposes the raw TypeORM repository for simple queries and a transactional
 * creation helper that guarantees atomicity for the user registration flow.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class UsersDBService {
  private readonly logger = new Logger(UsersDBService.name);
  readonly repository: Repository<UserEntity>;

  constructor(
    @InjectRepository(UserEntity)
    usersRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {
    this.repository = usersRepository;
  }

  /**
   * Persists a new {@link UserEntity} inside an atomic transaction.
   *
   * If any error is raised during the insert the transaction is rolled back and
   * the error is re-thrown for the caller to handle.
   *
   * @param data - Partial entity data to create and persist.
   * @returns The saved {@link UserEntity}.
   * @throws Any database-level error propagated from the transaction.
   */
  async createWithTransaction(data: Partial<UserEntity>): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(UserEntity, data);
      return manager.save(user);
    });
  }
}
