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
import { CertificacionEntity } from '../../database/entities/certificacion.entity';
import { StorageService } from '../../storage/storage.service';
import { CreateTutorDto } from './dtos/create-tutor.dto';
import { UpdateTutorDto } from './dtos/update-tutor.dto';
import { RegisterTutorDto } from './dtos/register-tutor.dto';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';

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
    @InjectRepository(CertificacionEntity)
    private readonly certRepository: Repository<CertificacionEntity>,
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
    const existing = await this.tutorRepository.findOne({ where: { clerkId } });
    if (existing) throw new ConflictException('El tutor ya está registrado');

    const tutor = this.tutorRepository.create({
      clerkId,
      email: dto.email,
      nombre: dto.nombre,
      apellido: dto.apellido,
      descripcion: dto.descripcion,
      estado: EstadoTutor.PENDIENTE,
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
      throw new BadRequestException(
        'No se pueden subir más de 10 certificaciones',
      );
    }

    const s3Key = `certificaciones/${tutorId}/${randomUUID()}-${file.originalname}`;

    this.storageService.uploadFile(s3Key, file.buffer, file.mimetype);

    const s3Url = await this.storageService.getPresignedUrl(s3Key, 900);

    const cert = this.certRepository.create({
      tutor,
      nombreArchivo: file.originalname,
      s3Key,
      s3Url,
      mimeType: file.mimetype,
    });
    const saved = await this.certRepository.save(cert);

    return {
      id: saved.id,
      nombre_archivo: saved.nombreArchivo,
      s3_url: saved.s3Url,
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
    const tutor = this.tutorRepository.create({
      clerkId: dto.clerkId,
      email: dto.email,
      bio: dto.bio,
      subjects: dto.subjects,
      experienceYears: dto.experienceYears,
    } as any);

    const saved = await this.tutorRepository.save(tutor as any); // TODO: Fix warning
    return Array.isArray(saved) ? saved[0] : saved; // TODO: Fix warning
  }

  async findAll(): Promise<TutorEntity[]> {
    return this.tutorRepository.find();
  }

  async findOne(id: string): Promise<TutorEntity> {
    const tutor = await this.tutorRepository.findOne({ where: { id } });
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
