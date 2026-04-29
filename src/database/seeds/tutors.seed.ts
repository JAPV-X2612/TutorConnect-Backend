import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { TutorEntity } from '../entities/tutor.entity';
import { CertificacionEntity } from '../entities/certificacion.entity';
import { BookingEntity } from '../entities/booking.entity';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = line.slice(separatorIndex + 1).trim();
  }
}

loadEnvFile(path.resolve(process.cwd(), '.env'));

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '5432';
  const database = process.env.DATABASE_NAME || 'tutorconnect';
  const user = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgres';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
  entities: [UserEntity, TutorEntity, CertificacionEntity, BookingEntity],
  synchronize: false,
  logging: false,
});

interface SeedTutor {
  clerkId: string;
  email: string;
  nombre: string;
  apellido: string;
  bio: string;
  subjects: string[];
  rating: number;
  precioHora: number;
  experienceYears: number;
  disponible: boolean;
}

const SEED_TUTORS: SeedTutor[] = [
  {
    clerkId: 'seed_clerk_elena',
    email: 'elena.rodriguez@seed.com',
    nombre: 'Elena',
    apellido: 'Rodríguez',
    bio: 'Profesora de matemáticas y física con 8 años de experiencia universitaria.',
    subjects: ['Matemáticas', 'Física'],
    rating: 4.9,
    precioHora: 25,
    experienceYears: 8,
    disponible: true,
  },
  {
    clerkId: 'seed_clerk_marcos',
    email: 'marcos.santos@seed.com',
    nombre: 'Marcos',
    apellido: 'Santos',
    bio: 'Desarrollador full-stack con experiencia en Python y JavaScript.',
    subjects: ['Programación'],
    rating: 4.8,
    precioHora: 35,
    experienceYears: 5,
    disponible: false,
  },
  {
    clerkId: 'seed_clerk_javier',
    email: 'javier.ruiz@seed.com',
    nombre: 'Javier',
    apellido: 'Ruiz',
    bio: 'Profesor nativo de inglés especializado en inglés de negocios.',
    subjects: ['Inglés'],
    rating: 5.0,
    precioHora: 22,
    experienceYears: 6,
    disponible: true,
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Connected to database.');

  const tutorRepo = AppDataSource.getRepository(TutorEntity);

  for (const data of SEED_TUTORS) {
    const existingTutor = await tutorRepo.findOne({
      where: { clerkId: data.clerkId },
    });

    if (existingTutor) {
      existingTutor.precioHora = data.precioHora;
      existingTutor.disponible = data.disponible;
      existingTutor.estado = EstadoTutor.VERIFICADO;
      await tutorRepo.save(existingTutor);
      console.log(`Updated tutor: ${data.nombre} ${data.apellido}`);
      continue;
    }

    const tutor = tutorRepo.create({
      clerkId: data.clerkId,
      email: data.email,
      nombre: data.nombre,
      apellido: data.apellido,
      bio: data.bio,
      subjects: data.subjects,
      rating: data.rating,
      precioHora: data.precioHora,
      experienceYears: data.experienceYears,
      disponible: data.disponible,
      estado: EstadoTutor.VERIFICADO,
    });
    await tutorRepo.save(tutor);
    console.log(`Created tutor: ${data.nombre} ${data.apellido}`);
  }

  await AppDataSource.destroy();
  console.log('Seed completed.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
