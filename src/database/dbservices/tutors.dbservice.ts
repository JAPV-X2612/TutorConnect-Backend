import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorEntity } from '../entities/tutor.entity';

@Injectable()
export class TutorsDBService {
  private readonly logger = new Logger(TutorsDBService.name);
  readonly repository: Repository<TutorEntity>;

  constructor(
    @InjectRepository(TutorEntity)
    tutorsRepository: Repository<TutorEntity>,
  ) {
    this.repository = tutorsRepository;
  }
}
