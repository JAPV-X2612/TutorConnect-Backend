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
import { UsersService } from './users.service';
import { UserEntity } from '../../database/entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED) // 201
  async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return await this.usersService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK) // 200
  async findAll(): Promise<UserEntity[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK) // 200
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return await this.usersService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK) // 200
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return await this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}


