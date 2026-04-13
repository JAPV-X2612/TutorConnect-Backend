import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../database/entities/booking.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { UpdateBookingDto } from './dtos/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepository: Repository<TutorEntity>,
  ) {}

  async create(dto: CreateBookingDto): Promise<BookingEntity> {
    const student = await this.userRepository.findOne({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException(`Student with id ${dto.studentId} not found`);

    const tutor = await this.tutorRepository.findOne({ where: { id: dto.tutorId } });
    if (!tutor) throw new NotFoundException(`Tutor with id ${dto.tutorId} not found`);

    const booking = this.bookingRepository.create({
      student,
      tutor,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      status: 'pending',
    } as any);

    const saved = await this.bookingRepository.save(booking as any);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(): Promise<BookingEntity[]> {
    return this.bookingRepository.find({ relations: ['student', 'tutor'] });
  }

  async findOne(id: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findOne({ where: { id }, relations: ['student', 'tutor'] });
    if (!booking) throw new NotFoundException(`Booking with id ${id} not found`);
    return booking;
  }

  async update(id: string, dto: UpdateBookingDto): Promise<BookingEntity> {
    const booking = await this.findOne(id);
    if (dto.startTime) booking.startTime = new Date(dto.startTime);
    if (dto.endTime) booking.endTime = new Date(dto.endTime);
    if (dto.status) booking.status = dto.status;
    const saved = await this.bookingRepository.save(booking as any);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async remove(id: string): Promise<void> {
    const booking = await this.findOne(id);
    await this.bookingRepository.remove(booking);
  }
}



