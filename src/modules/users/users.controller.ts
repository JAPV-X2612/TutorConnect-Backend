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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles, Role } from '../auth/role.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard, RoleGuard)
  @Roles(Role.APRENDIZ)
  async getMe(@Req() req: Request): Promise<{
    id: string;
    email: string;
    rol: string;
    created_at: Date;
  }> {
    const { clerk_id } = (req as any).user; // TODO: Fix error
    const user = await this.usersService.findByClerkId(clerk_id); // TODO: Fix warning
    return {
      id: user.id,
      email: user.email,
      rol: user.role,
      created_at: user.createdAt,
    };
  }

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
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserEntity> {
    return await this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 204
  async remove(@Param('id') id: string): Promise<void> {
    await this.usersService.remove(id);
  }
}
