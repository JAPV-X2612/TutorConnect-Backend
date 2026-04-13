import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersDBService {
  private readonly logger = new Logger(UsersDBService.name);
  readonly repository: Repository<UserEntity>;

  constructor(
    @InjectRepository(UserEntity)
    usersRepository: Repository<UserEntity>,
  ) {
    this.repository = usersRepository;
  }
}
