import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UserDto } from './dtos/user.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';

/** Typed shape of the authenticated user attached by {@link ClerkJwtGuard}. */
interface AuthenticatedRequest extends Request {
  user: { clerk_id: string; role: string | null };
}

/**
 * REST controller for user profile management (MOD-USR-002).
 *
 * All routes except {@link create} require a valid Clerk JWT.
 *
 * @author TutorConnect Team
 */
@ApiTags('users')
@Controller('users')
@UseGuards(ClerkJwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Returns the profile of the currently authenticated learner.
   *
   * @param req - Express request enriched with the Clerk JWT payload.
   * @returns Serialized user profile.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the profile of the currently authenticated user' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserDto> {
    const { clerk_id } = req.user;
    const user = await this.usersService.findByClerkId(clerk_id);
    if (!user) {
      throw new NotFoundException('No platform profile found for this identity');
    }
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  /**
   * Creates a new user profile.
   *
   * This endpoint intentionally does not require a guard so the frontend can
   * call it during Clerk-based registration before a platform profile exists.
   *
   * @param dto - Validated creation payload.
   * @returns The persisted user as {@link UserDto}.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user profile' })
  @ApiResponse({ status: 201, type: UserDto })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    const user = await this.usersService.create(dto);
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  /**
   * Returns all user profiles.
   *
   * @returns Array of serialized user DTOs.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all users' })
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((u) =>
      plainToInstance(UserDto, u, { excludeExtraneousValues: true }),
    );
  }

  /**
   * Returns a single user by internal id.
   *
   * @param id - Internal numeric primary key.
   * @returns The serialized user DTO.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    const user = await this.usersService.findOne(id);
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  /**
   * Partially updates an existing user profile.
   *
   * @param id - Internal numeric primary key.
   * @param dto - Fields to update (all optional).
   * @returns The updated user as {@link UserDto}.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Partially update a user profile' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    const user = await this.usersService.update(id, dto);
    return plainToInstance(UserDto, user, { excludeExtraneousValues: true });
  }

  /**
   * Deletes a user profile.
   *
   * @param id - Internal numeric primary key.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user profile' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.usersService.remove(id);
  }
}
