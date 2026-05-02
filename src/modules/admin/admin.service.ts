import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { TutorEntity } from '../../database/entities/tutor.entity';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { SearchService } from '../search/search.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { EstadoTutor } from '../../common/enums/estado-tutor.enum';

const TUTORS = [
  {
    clerkId: 'user_3D9Foq1YFG5wb0Kf1euYTXK5FlT',
    email: 'elena.demo@tutorconnect.co',
    nombre: 'Elena',
    apellido: 'Rodríguez',
    bio: 'Ingeniera matemática con doctorado en física teórica. Llevo 8 años enseñando cálculo y física universitaria. Mi enfoque es construir intuición antes de fórmulas: cada concepto lo ilustro con ejemplos reales de ingeniería y ciencias.',
    subjects: ['Matemáticas', 'Física', 'Cálculo'],
    rating: 4.9,
    courses: [
      {
        subject: 'Cálculo Diferencial e Integral',
        description: 'Domina límites, derivadas e integrales desde cero hasta nivel universitario avanzado. Ideal para estudiantes de ingeniería, matemáticas o física que necesitan base sólida o refuerzo para pasar la materia.',
        objectives: 'límites, continuidad, derivadas, regla de la cadena, integrales definidas e indefinidas, técnicas de integración, series de Taylor',
        price: 45000, duration: 60, modalidad: 'Virtual', academicLevel: 'Universitario', experienceYears: 8,
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
        price: 40000, duration: 60, modalidad: 'Virtual', academicLevel: 'Universitario', experienceYears: 8,
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
    bio: 'Desarrollador senior con 5 años de experiencia en Python, machine learning e ingeniería de datos. He mentoreado a más de 60 estudiantes universitarios y profesionales en transición hacia el mundo tech.',
    subjects: ['Programación', 'Python', 'Machine Learning'],
    rating: 4.8,
    courses: [
      {
        subject: 'Python para Data Science y Machine Learning',
        description: 'Curso práctico de Python orientado a análisis de datos, visualización y modelos de machine learning. Usamos datasets reales.',
        objectives: 'sintaxis Python, NumPy, Pandas, Matplotlib, scikit-learn, regresión lineal y logística, árboles de decisión, redes neuronales básicas',
        price: 60000, duration: 90, modalidad: 'Virtual', academicLevel: 'Universitario', experienceYears: 5,
        schedule: [
          { day: 'MONDAY', startTime: '19:00', endTime: '20:30' },
          { day: 'WEDNESDAY', startTime: '19:00', endTime: '20:30' },
        ],
      },
      {
        subject: 'Fundamentos de Programación con Python',
        description: 'Aprende a programar desde cero con Python. Lógica, estructuras de datos, algoritmos y resolución de problemas.',
        objectives: 'variables, tipos de datos, condicionales, bucles, funciones, listas, diccionarios, recursión, POO',
        price: 50000, duration: 60, modalidad: 'Virtual', academicLevel: 'Universitario', experienceYears: 5,
        schedule: [
          { day: 'TUESDAY', startTime: '18:00', endTime: '19:00' },
          { day: 'THURSDAY', startTime: '18:00', endTime: '19:00' },
        ],
      },
    ],
  },
  {
    clerkId: 'demo_javier',
    email: 'javier.demo@tutorconnect.co',
    nombre: 'Javier',
    apellido: 'Ruiz',
    bio: 'Profesor nativo de inglés con maestría en lingüística aplicada. 6 años enseñando inglés corporativo, preparación para IELTS y TOEFL, y comunicación ejecutiva.',
    subjects: ['Inglés', 'Comunicación'],
    rating: 5.0,
    courses: [
      {
        subject: 'Inglés para Negocios e Internacionalización',
        description: 'Domina el inglés en contextos corporativos: reuniones, presentaciones, negociaciones y correos ejecutivos.',
        objectives: 'vocabulario corporativo, presentaciones en inglés, escritura de emails formales, negociación, phrasal verbs de negocios',
        price: 55000, duration: 60, modalidad: 'Virtual', academicLevel: 'Profesional', experienceYears: 6,
        schedule: [
          { day: 'MONDAY', startTime: '07:00', endTime: '08:00' },
          { day: 'WEDNESDAY', startTime: '07:00', endTime: '08:00' },
        ],
      },
      {
        subject: 'Preparación IELTS / TOEFL',
        description: 'Prepárate para certificarte internacionalmente. Estrategias específicas para cada sección del examen.',
        objectives: 'estrategias de lectura en inglés, writing Task 1 y 2, speaking fluency, listening académico, vocabulario avanzado',
        price: 65000, duration: 90, modalidad: 'Virtual', academicLevel: 'Profesional', experienceYears: 6,
        schedule: [{ day: 'SATURDAY', startTime: '08:00', endTime: '10:00' }],
      },
    ],
  },
  {
    clerkId: 'demo_isabella',
    email: 'isabella.demo@tutorconnect.co',
    nombre: 'Isabella',
    apellido: 'García',
    bio: 'Chef profesional graduada del Cordon Bleu con 4 años enseñando gastronomía a adultos en Bogotá.',
    subjects: ['Gastronomía', 'Repostería', 'Cocina'],
    rating: 4.7,
    courses: [
      {
        subject: 'Repostería Francesa para Principiantes',
        description: 'Aprende las bases de la repostería clásica francesa desde tu cocina. Croissants, macarons, éclairs y mousses.',
        objectives: 'masas laminadas, merengues, cremas patissière, chocolate temperado, técnica de macarons',
        price: 40000, duration: 90, modalidad: 'Presencial', academicLevel: undefined, experienceYears: 4,
        schedule: [{ day: 'SATURDAY', startTime: '09:00', endTime: '12:00' }],
      },
      {
        subject: 'Cocina Italiana: Pastas y Salsas Artesanales',
        description: 'Domina las pastas frescas italianas y sus salsas clásicas.',
        objectives: 'pasta fresca al huevo, tagliatelle, gnocchi, salsa bolognesa, carbonara, marinara',
        price: 38000, duration: 90, modalidad: 'Presencial', academicLevel: undefined, experienceYears: 4,
        schedule: [{ day: 'SATURDAY', startTime: '14:00', endTime: '17:00' }],
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
    studentType: 'universitario',
    learningGoal: 'Quiero aprobar cálculo diferencial y aprender Python con machine learning para mi proyecto de grado en ingeniería de sistemas.',
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
    studentType: 'profesional',
    learningGoal: 'Quiero mejorar mi inglés para negocios internacionales y aprender repostería francesa para montar un negocio de postres.',
    academicProgram: 'Marketing y Negocios Internacionales',
    organizationName: undefined,
    currentSemester: undefined,
    interests: ['Inglés', 'Gastronomía', 'Comunicación', 'Repostería'],
  },
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TutorEntity)
    private readonly tutorRepo: Repository<TutorEntity>,
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepo: Repository<TutorCourseEntity>,
    private readonly searchService: SearchService,
  ) {}

  async runDemoSeed(): Promise<{ tutors: number; courses: number; learners: number }> {
    let tutorsCreated = 0;
    let coursesCreated = 0;
    let learnersCreated = 0;

    for (const data of TUTORS) {
      let userRow = await this.userRepo.findOne({ where: { clerkId: data.clerkId } });
      if (!userRow) {
        userRow = this.userRepo.create({
          clerkId: data.clerkId,
          email: data.email,
          firstName: data.nombre,
          lastName: data.apellido,
          role: UserRole.TUTOR,
          status: UserStatus.ACTIVE,
        });
        await this.userRepo.save(userRow);
      }

      let tutor = await this.tutorRepo.findOne({ where: { clerkId: data.clerkId } });
      if (!tutor) {
        tutor = this.tutorRepo.create({
          clerkId: data.clerkId,
          email: data.email,
          nombre: data.nombre,
          apellido: data.apellido,
          bio: data.bio,
          subjects: data.subjects,
          rating: data.rating,
          disponible: true,
          estado: EstadoTutor.VERIFICADO,
        });
        tutor = await this.tutorRepo.save(tutor);
        tutorsCreated++;
        this.logger.log(`Tutor created: ${data.nombre} ${data.apellido}`);
      }

      for (const c of data.courses) {
        const existing = await this.courseRepo.findOne({
          where: { tutor: { id: tutor.id }, subject: c.subject },
        });
        if (!existing) {
          const course = this.courseRepo.create({
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
          await this.courseRepo.save(course);
          coursesCreated++;
        }
      }
    }

    for (const data of LEARNERS) {
      let userRow = await this.userRepo.findOne({ where: { clerkId: data.clerkId } });
      if (!userRow) {
        userRow = this.userRepo.create({
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
        await this.userRepo.save(userRow);
        learnersCreated++;
        this.logger.log(`Learner created: ${data.firstName} ${data.lastName}`);
      } else {
        userRow.studentType = data.studentType;
        userRow.learningGoal = data.learningGoal;
        userRow.interests = data.interests;
        await this.userRepo.save(userRow);
      }
    }

    return { tutors: tutorsCreated, courses: coursesCreated, learners: learnersCreated };
  }

  async runIndex(): Promise<{ indexed: number }> {
    const result = await this.searchService.batchIndexAll();
    return result;
  }
}
