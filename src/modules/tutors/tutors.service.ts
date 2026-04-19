import {
  Injectable,
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
import { StorageService } from '../../storage/storage.service';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { TutorEstado } from '../../common/enums/tutor-estado.enum';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CERTIFICACIONES = 10;

@Injectable()
export class TutorsService {
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
    const user = await this.userRepository.findOne({ where: { clerkId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const existing = await this.tutorRepository.findOne({
      where: { user: { id: user.id } },
    });
    if (existing) throw new ConflictException('El tutor ya está registrado');

    const tutor = this.tutorRepository.create({
      user,
      nombre: dto.nombre,
      apellido: dto.apellido,
      descripcion: dto.descripcion,
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

  async update(id: string, dto: UpdateTutorDto): Promise<TutorEntity> {
    const tutor = await this.findOne(id);
    Object.assign(tutor, dto as any);
    const saved = await this.tutorRepository.save(tutor as any); // TODO: Fix warning
    return Array.isArray(saved) ? saved[0] : saved; // TODO: Fix warning
  }

  async remove(id: string): Promise<void> {
    const tutor = await this.findOne(id);
    await this.tutorRepository.remove(tutor);
  }
}
