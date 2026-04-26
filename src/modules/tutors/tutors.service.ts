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
import { UserEntity } from '../../users/entities/user.entity';
import { CertificacionEntity } from '../../database/entities/certificacion.entity';
import { TutorCourseEntity } from './entities/tutor-course.entity';
import { StorageService } from '../../storage/storage.service';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { CreateCourseDto } from './dtos/create-course.dto';
import { TutorEstado } from '../../common/enums/tutor-estado.enum';
import { UserRole } from '../../common/enums/user-role.enum';

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
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CertificacionEntity)
    private readonly certRepository: Repository<CertificacionEntity>,
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepository: Repository<TutorCourseEntity>,
    private readonly storageService: StorageService,
  ) {}

  // ── POST /tutors/register ─────────────────────────────────────────────────

  async register(
    clerkId: string,
    dto: RegisterTutorDto,
  ): Promise<{
    id: string;
    nombre: string;
    apellido: string;
    estado: TutorEstado;
  }> {
    this.logger.log(`[register] Request received for clerk_id=${clerkId}`);
    let user = await this.userRepository.findOne({ where: { clerkId } });

    if (!user) {
      // Webhook has not arrived yet — provision the UserEntity directly from Clerk.
      try {
        const clerkUser = await this.clerk.users.getUser(clerkId);
        const primaryEmail =
          clerkUser.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
          )?.emailAddress ??
          clerkUser.emailAddresses?.[0]?.emailAddress ??
          '';

        // The same email may already exist with a previous clerkId (e.g. the user
        // deleted their Clerk account and re-registered). Re-link instead of inserting.
        const byEmail = primaryEmail
          ? await this.userRepository.findOne({ where: { email: primaryEmail } })
          : null;

        if (byEmail) {
          this.logger.log(
            `[register] Re-linking email=${primaryEmail} from clerk_id=${byEmail.clerkId} → ${clerkId}`,
          );
          byEmail.clerkId = clerkId;
          byEmail.firstName = dto.nombre || byEmail.firstName;
          byEmail.lastName = dto.apellido || byEmail.lastName;
          byEmail.role = UserRole.TUTOR;
          user = await this.userRepository.save(byEmail);
        } else {
          user = this.userRepository.create({
            clerkId,
            email: primaryEmail,
            firstName: dto.nombre,
            lastName: dto.apellido,
            role: UserRole.TUTOR,
          });
          await this.userRepository.save(user);
        }
      } catch (err) {
        this.logger.error(
          `[register] Failed to provision user for clerk_id=${clerkId}: ${(err as Error).message}`,
        );
        throw new ForbiddenException(
          'No se pudo verificar el usuario en Clerk',
        );
      }
    } else if (user.role !== UserRole.TUTOR) {
      // Webhook arrived first and defaulted the role to LEARNER — correct it.
      this.logger.log(
        `[register] Correcting role LEARNER → TUTOR for clerk_id=${clerkId} (webhook race condition)`,
      );
      user.role = UserRole.TUTOR;
      await this.userRepository.save(user);
    }

    const existing = await this.tutorRepository.findOne({
      where: { user: { id: user.id } },
    });
    if (existing) throw new ConflictException('El tutor ya está registrado');

    // Save city on the associated UserEntity if provided.
    if (dto.ciudad && user.city !== dto.ciudad) {
      user.city = dto.ciudad.toUpperCase();
      await this.userRepository.save(user);
    }

    const tutor = this.tutorRepository.create({
      user,
      nombre: dto.nombre,
      apellido: dto.apellido,
      cedula: dto.cedula,
      descripcion: dto.descripcion,
      subjects: dto.especialidades ?? [],
      precioHora: dto.tarifa_hora ?? 0,
      experienceYears: dto.experiencia_years,
      estado: TutorEstado.PENDIENTE,
    });

    const saved = await this.tutorRepository.save(tutor);

    await this.clerk.users.updateUserMetadata(clerkId, {
      publicMetadata: { role: 'tutor' },
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
      relations: ['user', 'certificaciones'],
    });
    if (!tutor) throw new NotFoundException('Tutor no encontrado');
    if (tutor.user.clerkId !== clerkId)
      throw new ForbiddenException('Acceso denegado');

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten PDF, JPG y PNG');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo no puede superar 5 MB');
    }
    if (tutor.certificaciones.length >= MAX_CERTIFICACIONES) {
      throw new BadRequestException(
        'No se pueden subir más de 10 certificaciones',
      );
    }

    const s3Key = `certificaciones/${tutorId}/${randomUUID()}-${file.originalname}`;

    this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);

    const cert = this.certRepository.create({
      tutor,
      nombreArchivo: file.originalname,
      s3Key,
      mimeType: file.mimetype,
    });
    const saved = await this.certRepository.save(cert);

    const s3_url = this.storageService.getPresignedUrl(s3Key, 900);

    return {
      id: saved.id,
      nombre_archivo: saved.nombreArchivo,
      s3_url,
      mime_type: saved.mimeType,
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
    const tutor = await this.tutorRepository.findOne({
      where: { id: tutorId },
    });
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
        url_presignada: this.storageService.getPresignedUrl(cert.s3Key, 900),
        created_at: cert.createdAt,
      })),
    );
  }

  // ── CRUD existente ────────────────────────────────────────────────────────

  async create(dto: CreateTutorDto): Promise<TutorEntity> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user)
      throw new NotFoundException(`User with id ${dto.userId} not found`);

    const tutor = this.tutorRepository.create({
      user,
      bio: dto.bio,
      subjects: dto.subjects,
      experienceYears: dto.experienceYears,
    } as any);

    const saved = await this.tutorRepository.save(tutor as any); // TODO: Fix warning
    return Array.isArray(saved) ? saved[0] : saved; // TODO: Fix warning
  }

  async findAll(subject?: string): Promise<TutorEntity[]> {
    if (!subject) {
      return this.tutorRepository.find({ relations: ['user'] });
    }
    return this.tutorRepository
      .createQueryBuilder('tutor')
      .leftJoinAndSelect('tutor.user', 'user')
      .where('tutor.subjects LIKE :subject', { subject: `%${subject}%` })
      .getMany();
  }

  async findOne(id: string): Promise<TutorEntity> {
    const tutor = await this.tutorRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!tutor) throw new NotFoundException(`Tutor with id ${id} not found`);
    return tutor;
  }

  async findByClerkId(clerkId: string): Promise<TutorEntity> {
    const user = await this.userRepository.findOne({ where: { clerkId } });
    if (!user) throw new NotFoundException('User not found');
    const tutor = await this.tutorRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'certificaciones'],
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    return tutor;
  }

  async update(id: string, dto: UpdateTutorDto): Promise<TutorEntity> {
    const tutor = await this.findOne(id);

    // Fields that live on TutorEntity
    if (dto.nombre !== undefined) tutor.nombre = dto.nombre;
    if (dto.apellido !== undefined) tutor.apellido = dto.apellido;
    if (dto.cedula !== undefined) tutor.cedula = dto.cedula;
    if (dto.descripcion !== undefined) tutor.descripcion = dto.descripcion;
    if (dto.bio !== undefined) tutor.bio = dto.bio;
    if (dto.subjects !== undefined) tutor.subjects = dto.subjects;
    if (dto.precioHora !== undefined) tutor.precioHora = dto.precioHora;
    if (dto.experienceYears !== undefined) tutor.experienceYears = dto.experienceYears;

    // City lives on UserEntity
    if (dto.ciudad !== undefined && tutor.user) {
      tutor.user.city = dto.ciudad.toUpperCase();
      await this.userRepository.save(tutor.user);
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
