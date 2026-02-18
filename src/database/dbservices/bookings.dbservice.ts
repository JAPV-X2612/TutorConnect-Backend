import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';

@Injectable()
export class BookingsDBService {
  private readonly logger = new Logger(BookingsDBService.name);
  readonly repository: Repository<BookingEntity>;

  constructor(
    @InjectRepository(BookingEntity)
    bookingsRepository: Repository<BookingEntity>,
  ) {
    this.repository = bookingsRepository;
  }
}
