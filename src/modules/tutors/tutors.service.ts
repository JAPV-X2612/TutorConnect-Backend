import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createClerkClient } from '@clerk/backend';
import { randomUUID } from 'crypto';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { CertificacionEntity } from '../../database/entities/certificacion.entity';
import { TutorCourseEntity } from './entities/tutor-course.entity';
import { StorageService } from '../../storage/storage.service';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { CreateCourseDto } from './dtos/create-course.dto';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CERTIFICACIONES = 10;

@Injectable()
export class TutorsService {
  private readonly logger = new Logger(TutorsService.name);
  private readonly clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  constructor(
    @InjectRepository(TutorEntity)
    private readonly tutorRepository: Repository<TutorEntity>,
    @InjectRepository(CertificacionEntity)
    private readonly certRepository: Repository<CertificacionEntity>,
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepository: Repository<TutorCourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly storageService: StorageService,
  ) {}

  // ── GET /tutors/me ───────────────────────────────────────────────────────

  async getMe(clerkId: string): Promise<{
    exists: boolean;
    id?: string;
    hasCertificaciones?: boolean;
  }> {
    const tutor = await this.tutorRepository.findOne({
      where: { clerkId },
      relations: ['certificaciones'],
    });

    if (!tutor) return { exists: false };

    return {
      exists: true,
      id: tutor.id,
      hasCertificaciones: tutor.certificaciones.length > 0,
    };
  }

  // ── POST /tutors/register ─────────────────────────────────────────────────

  async register(
    clerkId: string,
    dto: RegisterTutorDto,
  ): Promise<{ id: string; nombre: string; apellido: string; estado: EstadoTutor }> {
    this.logger.log(`[register] Request received for clerk_id=${clerkId}`);

    const existing = await this.tutorRepository.findOne({ where: { clerkId } });
    if (existing) throw new ConflictException('El tutor ya está registrado');

    const tutor = this.tutorRepository.create({
      clerkId,
      email: dto.email,
      nombre: dto.nombre,
      apellido: dto.apellido,
      cedula: dto.cedula,
      descripcion: dto.descripcion,
      subjects: dto.especialidades ?? [],
      precioHora: dto.tarifa_hora ?? 0,
      experienceYears: dto.experiencia_years,
      estado: EstadoTutor.PENDIENTE,
    });

    const saved = await this.tutorRepository.save(tutor);

    // Upsert into UserEntity — handles both "webhook arrived" and "webhook not yet" cases.
    const existingUser = await this.userRepository.findOne({ where: { clerkId } });
    if (!existingUser) {
      // Check by email in case the user deleted and re-registered (re-link).
      const byEmail = dto.email
        ? await this.userRepository.findOne({ where: { email: dto.email } })
        : null;

      if (byEmail) {
        this.logger.log(
          `[register] Re-linking email=${dto.email} from clerk_id=${byEmail.clerkId} → ${clerkId}`,
        );
        byEmail.clerkId = clerkId;
        byEmail.firstName = dto.nombre || byEmail.firstName;
        byEmail.lastName = dto.apellido || byEmail.lastName;
        byEmail.role = UserRole.TUTOR;
        if (dto.ciudad) byEmail.city = dto.ciudad.toUpperCase();
        await this.userRepository.save(byEmail);
      } else {
        const userRow = this.userRepository.create({
          clerkId,
          email: dto.email,
          firstName: dto.nombre,
          lastName: dto.apellido,
          role: UserRole.TUTOR,
          status: UserStatus.ACTIVE,
          city: dto.ciudad ? dto.ciudad.toUpperCase() : undefined,
        });
        await this.userRepository.save(userRow);
      }
    } else {
      // User already exists — correct role if webhook defaulted to LEARNER.
      if (existingUser.role !== UserRole.TUTOR) {
        this.logger.log(
          `[register] Correcting role LEARNER → TUTOR for clerk_id=${clerkId}`,
        );
        existingUser.role = UserRole.TUTOR;
      }
      if (dto.ciudad) existingUser.city = dto.ciudad.toUpperCase();
      await this.userRepository.save(existingUser);
    }

    await this.clerk.users.updateUserMetadata(clerkId, {
      publicMetadata: { role: 'TUTOR' },
    });

    return {
      id: saved.id,
      nombre: saved.nombre,
      apellido: saved.apellido,
      estado: saved.estado,
    };
  }

  // ── POST /tutors/:id/certificaciones ─────────────────────────────────────

  async uploadCertificacion(
    tutorId: string,
    clerkId: string,
    file: Express.Multer.File,
  ): Promise<{
    id: string;
    nombre_archivo: string;
    s3_url: string;
    mime_type: string;
  }> {
    const tutor = await this.tutorRepository.findOne({
      where: { id: tutorId },
      relations: ['certificaciones'],
    });
    if (!tutor) throw new NotFoundException('Tutor no encontrado');
    if (tutor.clerkId !== clerkId) throw new ForbiddenException('Acceso denegado');

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten PDF, JPG y PNG');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo no puede superar 5 MB');
    }
    if (tutor.certificaciones.length >= MAX_CERTIFICACIONES) {
      throw new BadRequestException('No se pueden subir más de 10 certificaciones');
    }

    const s3Key = `certificaciones/${tutorId}/${randomUUID()}-${file.originalname}`;
    await this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);
    const s3Url = await this.storageService.getPresignedUrl(s3Key, 900);

    const cert = this.certRepository.create({
      tutor,
      nombreArchivo: file.originalname,
      s3Key,
      s3Url,
      mimeType: file.mimetype,
    });
    const savedCert = await this.certRepository.save(cert);

    return {
      id: savedCert.id,
      nombre_archivo: savedCert.nombreArchivo,
      s3_url: savedCert.s3Url,
      mime_type: savedCert.mimeType,
    };
  }

  // ── GET /tutors/:id/certificaciones ──────────────────────────────────────

  async getCertificaciones(tutorId: string): Promise<
    Array<{
      id: string;
      nombre_archivo: string;
      mime_type: string;
      url_presignada: string;
      created_at: Date;
    }>
  > {
    const tutor = await this.tutorRepository.findOne({ where: { id: tutorId } });
    if (!tutor) throw new NotFoundException('Tutor no encontrado');

    const certs = await this.certRepository.find({
      where: { tutor: { id: tutorId } },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      certs.map(async (cert) => ({
        id: cert.id,
        nombre_archivo: cert.nombreArchivo,
        mime_type: cert.mimeType,
        url_presignada: await this.storageService.getPresignedUrl(cert.s3Key, 900),
        created_at: cert.createdAt,
      })),
    );
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreateTutorDto): Promise<TutorEntity> {
    const tutor = this.tutorRepository.create({
      clerkId: dto.clerkId,
      email: dto.email,
      bio: dto.bio,
      subjects: dto.subjects,
      experienceYears: dto.experienceYears,
    } as any);

    const saved = await this.tutorRepository.save(tutor as any);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async findAll(subject?: string): Promise<TutorEntity[]> {
    if (!subject) {
      return this.tutorRepository.find();
    }
    return this.tutorRepository
      .createQueryBuilder('tutor')
      .where('tutor.subjects LIKE :subject', { subject: `%${subject}%` })
      .getMany();
  }

  async findOne(id: string): Promise<TutorEntity> {
    const tutor = await this.tutorRepository.findOne({ where: { id } });
    if (!tutor) throw new NotFoundException(`Tutor with id ${id} not found`);
    return tutor;
  }

  async findByClerkId(clerkId: string): Promise<TutorEntity> {
    const tutor = await this.tutorRepository.findOne({
      where: { clerkId },
      relations: ['certificaciones'],
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    return tutor;
  }

  async update(id: string, dto: UpdateTutorDto): Promise<TutorEntity> {
    const tutor = await this.findOne(id);

    if (dto.nombre !== undefined) tutor.nombre = dto.nombre;
    if (dto.apellido !== undefined) tutor.apellido = dto.apellido;
    if (dto.cedula !== undefined) tutor.cedula = dto.cedula;
    if (dto.descripcion !== undefined) tutor.descripcion = dto.descripcion;
    if (dto.bio !== undefined) tutor.bio = dto.bio;
    if (dto.subjects !== undefined) tutor.subjects = dto.subjects;
    if (dto.precioHora !== undefined) tutor.precioHora = dto.precioHora;
    if (dto.experienceYears !== undefined) tutor.experienceYears = dto.experienceYears;

    // City lives on UserEntity — update via clerkId.
    if (dto.ciudad !== undefined) {
      const userRow = await this.userRepository.findOne({ where: { clerkId: tutor.clerkId } });
      if (userRow) {
        userRow.city = dto.ciudad.toUpperCase();
        await this.userRepository.save(userRow);
      }
    }

    return this.tutorRepository.save(tutor);
  }

  async remove(id: string): Promise<void> {
    const tutor = await this.findOne(id);
    await this.tutorRepository.remove(tutor);
  }

  // ── Course management ─────────────────────────────────────────────────────

  async createCourse(clerkId: string, dto: CreateCourseDto): Promise<TutorCourseEntity> {
    const tutor = await this.findByClerkId(clerkId);
    const course = this.courseRepository.create({
      tutor,
      subject: dto.subject,
      description: dto.description,
      price: dto.price,
      duration: dto.duration ?? 60,
      modalidad: dto.modalidad,
      academicLevel: dto.academicLevel,
      isActive: true,
    });
    const saved = await this.courseRepository.save(course);
    this.logger.log(`[courses] Created course "${dto.subject}" for tutor ${tutor.id}`);
    return saved;
  }

  async getCourses(clerkId: string): Promise<TutorCourseEntity[]> {
    const tutor = await this.findByClerkId(clerkId);
    return this.courseRepository.find({
      where: { tutor: { id: tutor.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateCourse(
    courseId: string,
    clerkId: string,
    partial: Partial<CreateCourseDto> & { isActive?: boolean },
  ): Promise<TutorCourseEntity> {
    const tutor = await this.findByClerkId(clerkId);
    const course = await this.courseRepository.findOne({
      where: { id: courseId, tutor: { id: tutor.id } },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    Object.assign(course, partial);
    return this.courseRepository.save(course);
  }

  async deleteCourse(courseId: string, clerkId: string): Promise<void> {
    const tutor = await this.findByClerkId(clerkId);
    const course = await this.courseRepository.findOne({
      where: { id: courseId, tutor: { id: tutor.id } },
    });
    if (!course) throw new NotFoundException('Curso no encontrado');
    await this.courseRepository.remove(course);
  }
}
