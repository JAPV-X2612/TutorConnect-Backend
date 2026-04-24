import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { TutorsService } from './tutors.service';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';

@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  // ── GET /tutors/me ───────────────────────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getMe(@Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.tutorsService.getMe(clerk_id);
  }

  // ── POST /tutors/register ────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  async register(@Body() dto: RegisterTutorDto, @Req() req: Request) {
    const { clerk_id } = (req as any).user; // TODO: Fix error
    return this.tutorsService.register(clerk_id, dto); // TODO: Fix warning
  }

  // ── POST /tutors/:id/certificaciones ────────────────────────────────────

  @Post(':id/certificaciones')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadCertificacion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const { clerk_id } = (req as any).user; // TODO: Fix error
    return this.tutorsService.uploadCertificacion(id, clerk_id, file); // TODO: Fix warning
  }

  // ── GET /tutors/:id/certificaciones ──────────────────────────────────────

  @Get(':id/certificaciones')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getCertificaciones(@Param('id') id: string) {
    return this.tutorsService.getCertificaciones(id);
  }

  // ── CRUD existente ────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateTutorDto): Promise<TutorEntity> {
    return this.tutorsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('subject') subject?: string): Promise<TutorEntity[]> {
    return this.tutorsService.findAll(subject);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<TutorEntity> {
    return this.tutorsService.findOne(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTutorDto,
  ): Promise<TutorEntity> {
    return this.tutorsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.tutorsService.remove(id);
  }
}
