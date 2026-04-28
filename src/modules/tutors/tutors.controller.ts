import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { clerk_id: string; role: string };
}

import { TutorsService } from './tutors.service';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { CreateCourseDto } from './dtos/create-course.dto';

@Controller('tutors')
export class TutorsController {
  private readonly logger = new Logger(TutorsController.name);

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

  // ── PUT /tutors/me ────────────────────────────────────────────────────────

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async updateMe(@Body() dto: UpdateTutorDto, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    const tutor = await this.tutorsService.findByClerkId(clerk_id);
    await this.tutorsService.update(tutor.id, dto);
    // Return the full profile so the frontend state stays in sync.
    return this.tutorsService.getMe(clerk_id);
  }

  // ── Course CRUD ──────────────────────────────────────────────────────────

  @Post('me/courses')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  async createCourse(@Body() dto: CreateCourseDto, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.tutorsService.createCourse(clerk_id, dto);
  }

  @Get('me/courses')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async getCourses(@Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.tutorsService.getCourses(clerk_id);
  }

  @Patch('me/courses/:courseId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  async updateCourse(
    @Param('courseId') courseId: string,
    @Body() dto: Partial<CreateCourseDto> & { isActive?: boolean },
    @Req() req: Request,
  ) {
    const { clerk_id } = (req as any).user;
    return this.tutorsService.updateCourse(courseId, clerk_id, dto);
  }

  @Delete('me/courses/:courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ClerkJwtGuard)
  async deleteCourse(@Param('courseId') courseId: string, @Req() req: Request) {
    const { clerk_id } = (req as any).user;
    return this.tutorsService.deleteCourse(courseId, clerk_id);
  }

  // ── POST /tutors/me/certifications ───────────────────────────────────────

  @Post('me/certifications')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ClerkJwtGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadMyCertificacion(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      this.logger.warn(
        `Upload failed — no file received. Content-Type=${req.headers['content-type']}`,
      );
      throw new BadRequestException(
        'No se recibió ningún archivo. Asegúrate de enviarlo con field name "file" en multipart/form-data.',
      );
    }
    const { clerk_id } = req.user;
    return this.tutorsService.uploadOwnCertificacion(clerk_id, file);
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

  // ── Public marketplace ────────────────────────────────────────────────────

  @Get('courses')
  @HttpCode(HttpStatus.OK)
  async getCourseListings(@Query('subject') subject?: string) {
    return this.tutorsService.getCourseListings(subject);
  }

  @Get('courses/:courseId')
  @HttpCode(HttpStatus.OK)
  async getCourseDetail(@Param('courseId') courseId: string) {
    return this.tutorsService.getCourseDetail(courseId);
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
