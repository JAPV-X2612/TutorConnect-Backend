import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { UpdateBookingDto } from './dtos/update-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() dto: CreateBookingDto): Promise<BookingEntity> {
    return await this.bookingsService.create(dto);
  }

  @Get()
  async findAll(): Promise<BookingEntity[]> {
    return await this.bookingsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<BookingEntity> {
    return await this.bookingsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateBookingDto): Promise<BookingEntity> {
    return await this.bookingsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.bookingsService.remove(id);
    return { success: true };
  }
}


