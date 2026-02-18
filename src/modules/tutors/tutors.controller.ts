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
import { TutorsService } from './tutors.service';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  async create(@Body() dto: CreateTutorDto): Promise<TutorEntity> {
    return await this.tutorsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK) // 200
  async findAll(): Promise<TutorEntity[]> {
    return await this.tutorsService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK) // 200
  async findOne(@Param('id') id: string): Promise<TutorEntity> {
    return await this.tutorsService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK) // 200
  async update(@Param('id') id: string, @Body() dto: UpdateTutorDto): Promise<TutorEntity> {
    return await this.tutorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async remove(@Param('id') id: string): Promise<void> {
    await this.tutorsService.remove(id);
  }
}




