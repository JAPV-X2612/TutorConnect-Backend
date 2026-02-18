import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingEntity } from '../../database/entities/booking.entity';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { UpdateBookingDto } from './dtos/update-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  async create(@Body() dto: CreateBookingDto): Promise<BookingEntity> {
    return await this.bookingsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK) // 200
  async findAll(): Promise<BookingEntity[]> {
    return await this.bookingsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK) // 200
  async findOne(@Param('id') id: string): Promise<BookingEntity> {
    return await this.bookingsService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK) // 200
  async update(@Param('id') id: string, @Body() dto: UpdateBookingDto): Promise<BookingEntity> {
    return await this.bookingsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async remove(@Param('id') id: string): Promise<void> {
    await this.bookingsService.remove(id);
  }
}


