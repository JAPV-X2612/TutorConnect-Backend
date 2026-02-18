import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';

@Injectable()
export class TutorsService {
  constructor(
    @InjectRepository(TutorEntity)
    private readonly tutorRepository: Repository<TutorEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: CreateTutorDto): Promise<TutorEntity> {
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User with id ${dto.userId} not found`);

    const tutor = this.tutorRepository.create({
      user,
      bio: dto.bio,
      subjects: dto.subjects,
      experienceYears: dto.experienceYears,
    } as any);

    const saved = await this.tutorRepository.save(tutor as any);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(): Promise<TutorEntity[]> {
    return this.tutorRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<TutorEntity> {
    const tutor = await this.tutorRepository.findOne({ where: { id }, relations: ['user'] });
    if (!tutor) throw new NotFoundException(`Tutor with id ${id} not found`);
    return tutor;
  }

  async update(id: string, dto: UpdateTutorDto): Promise<TutorEntity> {
    const tutor = await this.findOne(id);
    Object.assign(tutor, dto as any);
    const saved = await this.tutorRepository.save(tutor as any);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async remove(id: string): Promise<void> {
    const tutor = await this.findOne(id);
    await this.tutorRepository.remove(tutor);
  }
}



