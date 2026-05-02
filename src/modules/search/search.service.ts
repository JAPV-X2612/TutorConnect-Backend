import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TutorCourseEntity } from '../tutors/entities/tutor-course.entity';
import { UserEntity } from '../users/entities/user.entity';
import { GeminiEmbeddingService } from './gemini-embedding.service';

export interface CourseSearchResult {
  id: string;
  subject: string;
  description?: string;
  price: number;
  duration: number;
  modalidad: string;
  academicLevel?: string;
  score: number;
  tutor: {
    id: string;
    nombre: string;
    apellido: string;
    rating?: number;
    disponible: boolean;
  };
}

/**
 * Semantic search and personalized recommendations powered by pgvector + Voyage AI.
 *
 * Courses are represented as 1024-dim vectors stored in the `embedding` column of
 * `tutor_courses`. Similarity is measured with cosine distance via the `<=>` operator.
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-01
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(TutorCourseEntity)
    private readonly courseRepo: Repository<TutorCourseEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly embeddingService: GeminiEmbeddingService,
  ) {}

  // ── Indexing ──────────────────────────────────────────────────────────────

  /** Builds the plain-text document used to embed a course. */
  private buildCourseDocument(course: TutorCourseEntity): string {
    const tutor = course.tutor as any;
    return [
      `Curso de ${course.subject}.`,
      course.description ?? '',
      course.objectives ? `Aprenderás: ${course.objectives}.` : '',
      `Modalidad: ${course.modalidad}.`,
      course.academicLevel ? `Nivel académico: ${course.academicLevel}.` : '',
      `Duración: ${course.duration} minutos.`,
      tutor?.nombre ? `Tutor: ${tutor.nombre} ${tutor.apellido}.` : '',
      tutor?.subjects?.length ? `Especialidades: ${(tutor.subjects as string[]).join(', ')}.` : '',
      tutor?.bio ?? tutor?.descripcion ?? '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Generates and persists the embedding for a single course.
   * Safe to call fire-and-forget — errors are logged, not thrown.
   */
  async indexCourse(courseId: string): Promise<void> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['tutor'],
    });
    if (!course) return;

    const doc = this.buildCourseDocument(course);
    const vector = await this.embeddingService.embed(doc, 'document');

    await this.dataSource.query(
      `UPDATE tutor_courses SET embedding = $1::vector WHERE id = $2`,
      [`[${vector.join(',')}]`, courseId],
    );
    this.logger.log(`Indexed course "${course.subject}" (${courseId})`);
  }

  /** Batch-indexes all active courses. Returns counts for monitoring. */
  async batchIndexAll(): Promise<{ indexed: number; errors: number }> {
    const courses = await this.courseRepo.find({
      where: { isActive: true },
      relations: ['tutor'],
    });

    let indexed = 0;
    let errors = 0;

    for (const course of courses) {
      try {
        const doc = this.buildCourseDocument(course);
        const vector = await this.embeddingService.embed(doc, 'document');
        await this.dataSource.query(
          `UPDATE tutor_courses SET embedding = $1::vector WHERE id = $2`,
          [`[${vector.join(',')}]`, course.id],
        );
        indexed++;
        this.logger.log(`Indexed "${course.subject}" (${course.id})`);
      } catch (err: any) {
        this.logger.error(`Failed to index course ${course.id}: ${err?.message}`);
        errors++;
      }
    }

    return { indexed, errors };
  }

  // ── Querying ──────────────────────────────────────────────────────────────

  /**
   * Semantic search: embed the user's query and return the closest courses.
   */
  async semanticSearch(query: string, limit = 10): Promise<CourseSearchResult[]> {
    const vector = await this.embeddingService.embed(query, 'query');
    return this.queryByVector(vector, limit);
  }

  /**
   * Personalized recommendations: embed the learner's profile and return
   * the courses most aligned with their interests and academic context.
   */
  async getRecommendations(
    learnerClerkId: string,
    limit = 10,
  ): Promise<CourseSearchResult[]> {
    const user = await this.userRepo.findOne({ where: { clerkId: learnerClerkId } });
    if (!user) throw new NotFoundException('User not found');

    const parts: string[] = [];

    // Lead with the learning goal — highest semantic signal.
    if (user.learningGoal) parts.push(user.learningGoal);

    // Student-type context gives the embedding important grounding.
    switch (user.studentType) {
      case 'universitario':
        parts.push('Soy estudiante universitario.');
        if (user.academicProgram) parts.push(`Estudio ${user.academicProgram}.`);
        if (user.currentSemester) parts.push(`Voy en semestre ${user.currentSemester}.`);
        if (user.organizationName) parts.push(`Universidad: ${user.organizationName}.`);
        break;
      case 'colegial':
        parts.push('Soy estudiante de colegio.');
        if (user.schoolGrade) parts.push(`Cursando grado ${user.schoolGrade}.`);
        if (user.organizationName) parts.push(`Colegio: ${user.organizationName}.`);
        break;
      case 'profesional':
        parts.push('Soy un profesional o trabajador independiente.');
        if (user.academicProgram) parts.push(`Mi área: ${user.academicProgram}.`);
        break;
      default:
        if (user.academicProgram) parts.push(`Área de estudio: ${user.academicProgram}.`);
        if (user.currentSemester) parts.push(`Semestre ${user.currentSemester}.`);
    }

    if (user.interests?.length) parts.push(`Intereses: ${user.interests.join(', ')}.`);

    if (!parts.length) return [];

    const vector = await this.embeddingService.embed(parts.join(' '), 'query');
    return this.queryByVector(vector, limit);
  }

  private async queryByVector(
    vector: number[],
    limit: number,
  ): Promise<CourseSearchResult[]> {
    const rows = await this.dataSource.query<any[]>(
      `SELECT
          c.id,
          c.subject,
          c.description,
          c.price,
          c.duration,
          c.modalidad,
          c."academicLevel"            AS "academicLevel",
          1 - (c.embedding <=> $1::vector) AS score,
          t.id                         AS "tutorId",
          t.nombre,
          t.apellido,
          t.rating,
          t.disponible
       FROM tutor_courses c
       JOIN tutors t ON t.id = c."tutorId"
       WHERE c."isActive" = true
         AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      [`[${vector.join(',')}]`, limit],
    );

    return rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      description: r.description ?? undefined,
      price: Number(r.price),
      duration: Number(r.duration),
      modalidad: r.modalidad,
      academicLevel: r.academicLevel ?? undefined,
      score: Number(r.score),
      tutor: {
        id: r.tutorId,
        nombre: r.nombre,
        apellido: r.apellido,
        rating: r.rating != null ? Number(r.rating) : undefined,
        disponible: Boolean(r.disponible),
      },
    }));
  }
}
