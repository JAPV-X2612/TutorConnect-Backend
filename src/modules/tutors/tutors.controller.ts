import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TutorsService } from './tutors.service';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Post()
  async create(@Body() dto: CreateTutorDto): Promise<TutorEntity> {
    return await this.tutorsService.create(dto);
  }

  @Get()
  async findAll(): Promise<TutorEntity[]> {
    return await this.tutorsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TutorEntity> {
    return await this.tutorsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTutorDto): Promise<TutorEntity> {
    return await this.tutorsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tutorsService.remove(id);
    return { success: true };
  }
}




