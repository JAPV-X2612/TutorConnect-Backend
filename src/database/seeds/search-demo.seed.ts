/**
 * Search demo seed — creates two tutor groups and two learners to validate
 * semantic search and personalized recommendations.
 *
 * Group A (STEM): Elena (Math/Physics) + Marcos (Programming)
 * Group B (Arts): Javier (English) + Isabella (Gastronomy)
 *
 * Learner A: engineering student → should match Group A
 * Learner B: marketing professional → should match Group B
 *
 * After running this seed, call POST /api/search/index to generate embeddings.
 *
 * @author TutorConnect Team
 */
import 'reflect-metadata';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { CertificacionEntity } from '../entities/certificacion.entity';
import { TutorEntity } from '../entities/tutor.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { LearnerPreferenceEntity } from '../../modules/users/entities/learner-preference.entity';
import { TutorTopicEntity } from '../../modules/tutors/entities/tutor-topic.entity';
import { TutorAvailabilityEntity } from '../../modules/tutors/entities/tutor-availability.entity';
import { TutorCertificationEntity } from '../../modules/tutors/entities/tutor-certification.entity';
import { TutorCourseEntity } from '../../modules/tutors/entities/tutor-course.entity';
import { ChatChannelEntity } from '../../modules/messaging/entities/chat-channel.entity';
import { MessageEntity } from '../../modules/messaging/entities/message.entity';
import { ReviewEntity } from '../../modules/reviews/entities/review.entity';
import { PaymentEntity } from '../../modules/payments/entities/payment.entity';
import { ScheduleSlot } from '../../modules/tutors/entities/tutor-course.entity';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

// ── Env loading ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: path.resolve(process.cwd(), '.env'), override: true });

const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DATABASE_HOST     || 'localhost',
  port:     parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME     || 'tutorconnect',
  username: process.env.DATABASE_USER     || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  entities: [
    BookingEntity, CertificacionEntity, TutorEntity,
    UserEntity, LearnerPreferenceEntity,
    TutorTopicEntity, TutorAvailabilityEntity, TutorCertificationEntity, TutorCourseEntity,
    ChatChannelEntity, MessageEntity, ReviewEntity, PaymentEntity,
  ],
  synchronize: false,
  logging: false,
});

// ── Seed data ─────────────────────────────────────────────────────────────────

const TUTORS = [
  // ── Group A: STEM ──────────────────────────────────────────────────────────
  {
    clerkId: 'demo_elena',
    email: 'elena.demo@tutorconnect.co',
    nombre: 'Elena',
    apellido: 'Rodríguez',
    bio: 'Ingeniera matemática con doctorado en física teórica. Llevo 8 años enseñando cálculo y física universitaria. Mi enfoque es construir intuición antes de fórmulas: cada concepto lo ilustro con ejemplos reales de ingeniería y ciencias.',
    subjects: ['Matemáticas', 'Física', 'Cálculo'],
    rating: 4.9,
    disponible: true,
    courses: [
      {
        subject: 'Cálculo Diferencial e Integral',
        description: 'Domina límites, derivadas e integrales desde cero hasta nivel universitario avanzado. Ideal para estudiantes de ingeniería, matemáticas o física que necesitan base sólida o refuerzo para pasar la materia.',
        objectives: 'límites, continuidad, derivadas, regla de la cadena, integrales definidas e indefinidas, técnicas de integración, series de Taylor',
        price: 45000,
        duration: 60,
        modalidad: 'Virtual',
        academicLevel: 'Universitario',
        experienceYears: 8,
        schedule: [
          { day: 'MONDAY', startTime: '18:00', endTime: '20:00' },
          { day: 'WEDNESDAY', startTime: '18:00', endTime: '20:00' },
          { day: 'SATURDAY', startTime: '09:00', endTime: '12:00' },
        ],
      },
      {
        subject: 'Física Universitaria',
        description: 'Mecánica clásica, termodinámica y electromagnetismo para estudiantes universitarios. Resolvemos ejercicios tipo examen parcial con metodología paso a paso.',
        objectives: 'cinemática, dinámica de Newton, trabajo y energía, momentum, oscilaciones, ondas, campos eléctricos, ley de Gauss',
        price: 40000,
        duration: 60,
        modalidad: 'Virtual',
        academicLevel: 'Universitario',
        experienceYears: 8,
        schedule: [
          { day: 'TUESDAY', startTime: '17:00', endTime: '19:00' },
          { day: 'THURSDAY', startTime: '17:00', endTime: '19:00' },
        ],
      },
    ],
  },
  {
    clerkId: 'demo_marcos',
    email: 'marcos.demo@tutorconnect.co',
    nombre: 'Marcos',
    apellido: 'Santos',
    bio: 'Desarrollador senior con 5 años de experiencia en Python, machine learning e ingeniería de datos. He mentoreado a más de 60 estudiantes universitarios y profesionales en transición hacia el mundo tech. Aprenderás programando proyectos reales desde la primera sesión.',
    subjects: ['Programación', 'Python', 'Machine Learning'],
    rating: 4.8,
    disponible: true,
    courses: [
      {
        subject: 'Python para Data Science y Machine Learning',
        description: 'Curso práctico de Python orientado a análisis de datos, visualización y modelos de machine learning. Usamos datasets reales. Ideal para universitarios de ingeniería o profesionales que quieren entrar al mundo de los datos.',
        objectives: 'sintaxis Python, NumPy, Pandas, Matplotlib, scikit-learn, regresión lineal y logística, árboles de decisión, redes neuronales básicas, manejo de datos con Jupyter',
        price: 60000,
        duration: 90,
        modalidad: 'Virtual',
        academicLevel: 'Universitario',
        experienceYears: 5,
        schedule: [
          { day: 'MONDAY', startTime: '19:00', endTime: '20:30' },
          { day: 'WEDNESDAY', startTime: '19:00', endTime: '20:30' },
          { day: 'FRIDAY', startTime: '19:00', endTime: '20:30' },
        ],
      },
      {
        subject: 'Fundamentos de Programación con Python',
        description: 'Aprende a programar desde cero con Python. Lógica, estructuras de datos, algoritmos y resolución de problemas. Perfecto para estudiantes universitarios de primer año o quien quiera cambiar de carrera hacia sistemas.',
        objectives: 'variables, tipos de datos, condicionales, bucles, funciones, listas, diccionarios, recursión, complejidad algorítmica básica, POO',
        price: 50000,
        duration: 60,
        modalidad: 'Virtual',
        academicLevel: 'Universitario',
        experienceYears: 5,
        schedule: [
          { day: 'TUESDAY', startTime: '18:00', endTime: '19:00' },
          { day: 'THURSDAY', startTime: '18:00', endTime: '19:00' },
          { day: 'SATURDAY', startTime: '10:00', endTime: '12:00' },
        ],
      },
    ],
  },

  // ── Group B: Arts & Languages ──────────────────────────────────────────────
  {
    clerkId: 'demo_javier',
    email: 'javier.demo@tutorconnect.co',
    nombre: 'Javier',
    apellido: 'Ruiz',
    bio: 'Profesor nativo de inglés con maestría en lingüística aplicada. 6 años enseñando inglés corporativo, preparación para IELTS y TOEFL, y comunicación ejecutiva. Trabajo con profesionales que necesitan el idioma para avanzar en su carrera internacional.',
    subjects: ['Inglés', 'Comunicación'],
    rating: 5.0,
    disponible: true,
    courses: [
      {
        subject: 'Inglés para Negocios e Internacionalización',
        description: 'Domina el inglés en contextos corporativos: reuniones, presentaciones, negociaciones y correos ejecutivos. Dirigido a profesionales y empresarios que necesitan comunicarse con clientes o socios internacionales.',
        objectives: 'vocabulario corporativo, presentaciones en inglés, escritura de emails formales, negociación, videoconferencias, phrasal verbs de negocios, inglés para marketing y ventas',
        price: 55000,
        duration: 60,
        modalidad: 'Virtual',
        academicLevel: 'Profesional',
        experienceYears: 6,
        schedule: [
          { day: 'MONDAY', startTime: '07:00', endTime: '08:00' },
          { day: 'WEDNESDAY', startTime: '07:00', endTime: '08:00' },
          { day: 'FRIDAY', startTime: '07:00', endTime: '08:00' },
        ],
      },
      {
        subject: 'Preparación IELTS / TOEFL',
        description: 'Prepárate para certificarte internacionalmente. Estrategias específicas para cada sección del examen: listening, reading, writing y speaking. Simulacros con retroalimentación detallada.',
        objectives: 'estrategias de lectura en inglés, writing Task 1 y 2, speaking fluency, listening académico, vocabulario avanzado, manejo del tiempo en examen',
        price: 65000,
        duration: 90,
        modalidad: 'Virtual',
        academicLevel: 'Profesional',
        experienceYears: 6,
        schedule: [
          { day: 'TUESDAY', startTime: '06:30', endTime: '08:00' },
          { day: 'SATURDAY', startTime: '08:00', endTime: '10:00' },
        ],
      },
    ],
  },
  {
    clerkId: 'demo_isabella',
    email: 'isabella.demo@tutorconnect.co',
    nombre: 'Isabella',
    apellido: 'García',
    bio: 'Chef profesional graduada del Cordon Bleu con 4 años enseñando gastronomía a adultos en Bogotá. Me apasiona la repostería francesa, la cocina italiana y las técnicas de emplatado. Mis clases son prácticas: aprendemos haciendo, no viendo.',
    subjects: ['Gastronomía', 'Repostería', 'Cocina'],
    rating: 4.7,
    disponible: true,
    courses: [
      {
        subject: 'Repostería Francesa para Principiantes',
        description: 'Aprende las bases de la repostería clásica francesa desde tu cocina. Croissants, macarons, éclairs y mousses. Cada sesión es 100% práctica con los ingredientes que consigues en Colombia.',
        objectives: 'masas laminadas, merengues, cremas patissière y chantilly, chocolate temperado, técnica de macarons, decoración básica de tortas, postres fríos y calientes',
        price: 40000,
        duration: 90,
        modalidad: 'Presencial',
        academicLevel: undefined,
        experienceYears: 4,
        schedule: [
          { day: 'SATURDAY', startTime: '09:00', endTime: '12:00' },
          { day: 'SUNDAY', startTime: '09:00', endTime: '12:00' },
        ],
      },
      {
        subject: 'Cocina Italiana: Pastas y Salsas Artesanales',
        description: 'Domina las pastas frescas italianas y sus salsas clásicas. Aprenderás a hacer pasta desde cero y a combinarla con salsas auténticas: bolognesa, carbonara, amatriciana y más. Clase presencial en Bogotá.',
        objectives: 'pasta fresca al huevo, tagliatelle, pappardelle, gnocchi, salsa bolognesa auténtica, carbonara sin crema, marinara, técnicas de saltear, maridaje básico con vinos',
        price: 38000,
        duration: 90,
        modalidad: 'Presencial',
        academicLevel: undefined,
        experienceYears: 4,
        schedule: [
          { day: 'SATURDAY', startTime: '14:00', endTime: '17:00' },
        ],
      },
    ],
  },
];

const LEARNERS = [
  {
    clerkId: 'user_3CxltRt7waj68L8sCSXs8XDQhYE',
    email: 'andres.demo@tutorconnect.co',
    firstName: 'Andrés',
    lastName: 'Morales',
    // This profile should align strongly with Elena and Marcos (STEM)
    studentType: 'universitario',
    learningGoal: 'Quiero aprobar cálculo diferencial que es la materia que más se me dificulta, y aprender Python con machine learning para mi proyecto de grado en ingeniería de sistemas.',
    academicProgram: 'Ingeniería de Sistemas',
    organizationName: 'Universidad Nacional de Colombia',
    currentSemester: 5,
    interests: ['Matemáticas', 'Programación', 'Física', 'Cálculo'],
  },
  {
    clerkId: 'user_3Cv9VeNIhRV6RCHILEpagSqneHV',
    email: 'valentina.demo@tutorconnect.co',
    firstName: 'Valentina',
    lastName: 'Castro',
    // This profile should align with Javier (English) and Isabella (Gastronomy)
    studentType: 'profesional',
    learningGoal: 'Quiero mejorar mi inglés para negocios internacionales porque tengo reuniones con clientes en Estados Unidos. También me interesa aprender repostería francesa como hobby y para montar un negocio de postres.',
    academicProgram: 'Marketing y Negocios Internacionales',
    organizationName: undefined,
    currentSemester: undefined,
    interests: ['Inglés', 'Gastronomía', 'Comunicación', 'Repostería'],
  },
];

// ── Seed runner ───────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  const pass = process.env.DATABASE_PASSWORD ?? '';
  console.log('DB user:', process.env.DATABASE_USER);
  console.log('DB host:', process.env.DATABASE_HOST);
  console.log('DB name:', process.env.DATABASE_NAME);
  console.log('DB pass:', pass.slice(0, 2) + '*'.repeat(Math.max(0, pass.length - 2)));
  await AppDataSource.initialize();
  console.log('✓ Connected to database\n');

  const userRepo   = AppDataSource.getRepository(UserEntity);
  const tutorRepo  = AppDataSource.getRepository(TutorEntity);
  const courseRepo = AppDataSource.getRepository(TutorCourseEntity);

  // ── Tutors ────────────────────────────────────────────────────────────────

  console.log('── Seeding tutors ──────────────────────────────');
  for (const data of TUTORS) {
    // UserEntity (for role/auth)
    let userRow = await userRepo.findOne({ where: { clerkId: data.clerkId } });
    if (!userRow) {
      userRow = userRepo.create({
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.nombre,
        lastName: data.apellido,
        role: UserRole.TUTOR,
        status: UserStatus.ACTIVE,
      });
      await userRepo.save(userRow);
    }

    // TutorEntity
    let tutor = await tutorRepo.findOne({ where: { clerkId: data.clerkId } });
    if (!tutor) {
      tutor = tutorRepo.create({
        clerkId: data.clerkId,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        bio: data.bio,
        subjects: data.subjects,
        rating: data.rating,
        disponible: data.disponible,
        estado: EstadoTutor.VERIFICADO,
      });
      tutor = await tutorRepo.save(tutor);
      console.log(`  ✓ Tutor: ${data.nombre} ${data.apellido}`);
    } else {
      console.log(`  ~ Tutor already exists: ${data.nombre} ${data.apellido}`);
    }

    // Courses
    for (const c of data.courses) {
      const existing = await courseRepo.findOne({
        where: { tutor: { id: tutor.id }, subject: c.subject },
      });
      if (!existing) {
        const course = courseRepo.create({
          tutor,
          subject: c.subject,
          description: c.description,
          objectives: c.objectives,
          experienceYears: c.experienceYears,
          price: c.price,
          duration: c.duration,
          modalidad: c.modalidad,
          academicLevel: c.academicLevel ?? undefined,
          schedule: c.schedule as any,
          isActive: true,
        });
        await courseRepo.save(course);
        console.log(`    ✓ Course: "${c.subject}"`);
      } else {
        console.log(`    ~ Course already exists: "${c.subject}"`);
      }
    }
  }

  // ── Learners ──────────────────────────────────────────────────────────────

  console.log('\n── Seeding learners ────────────────────────────');
  for (const data of LEARNERS) {
    let userRow = await userRepo.findOne({ where: { clerkId: data.clerkId } });
    if (!userRow) {
      userRow = userRepo.create({
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: UserRole.LEARNER,
        status: UserStatus.ACTIVE,
        studentType: data.studentType,
        learningGoal: data.learningGoal,
        academicProgram: data.academicProgram,
        organizationName: data.organizationName ?? undefined,
        currentSemester: data.currentSemester ?? undefined,
        interests: data.interests,
      });
      await userRepo.save(userRow);
      console.log(`  ✓ Learner: ${data.firstName} ${data.lastName}`);
    } else {
      // Update profile fields in case they changed
      userRow.studentType    = data.studentType;
      userRow.learningGoal   = data.learningGoal;
      userRow.academicProgram = data.academicProgram;
      userRow.interests      = data.interests;
      await userRepo.save(userRow);
      console.log(`  ~ Learner updated: ${data.firstName} ${data.lastName}`);
    }
  }

  console.log(`
────────────────────────────────────────────────
✓ Seed completed.

Next step — generate embeddings for all courses:
  curl -X POST http://localhost:3000/api/search/index \\
       -H "Authorization: Bearer <token-de-cualquier-usuario>"

Expected recommendations:
  Andrés  → Cálculo Diferencial, Física, Python (Elena & Marcos)
  Valentina → Inglés Negocios, IELTS, Repostería (Javier & Isabella)
────────────────────────────────────────────────
  `);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
