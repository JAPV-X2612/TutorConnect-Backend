import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ReviewEntity } from '../entities/review.entity';
import { BookingEntity } from '../../../database/entities/booking.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { CreateReviewDto } from '../dtos/requests/create-review.dto';
import { ReviewResponseDto } from '../dtos/responses/review.response.dto';
import { TutorReviewSummaryDto } from '../dtos/responses/tutor-review-summary.dto';

/**
 * Domain service handling the lifecycle of session reviews submitted by
 * learners after a completed booking.
 *
 * Reviews are immutable once created (no edit, no delete from the API).
 *
 * @author TutorConnect Team
 * @version 1.0
 * @since 2026-05-02
 */
@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  /**
   * Creates a review for a completed booking owned by the authenticated learner.
   *
   * @throws NotFoundException  when the booking, learner, or tutor user record
   *                            cannot be resolved.
   * @throws ForbiddenException when the booking does not belong to the learner.
   * @throws ConflictException  when the booking is not yet completed or when a
   *                            review already exists for this (booking, learner)
   *                            pair.
   */
  async createReview(
    learnerClerkId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['student', 'tutor'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    if (!booking.student || booking.student.id !== learner.id) {
      throw new ForbiddenException('Acceso denegado');
    }

    if (booking.status !== 'completed') {
      throw new ConflictException(
        'Solo se pueden calificar sesiones completadas',
      );
    }

    // Tutor on the booking is a TutorEntity (legacy); ReviewEntity.tutor
    // links to UserEntity, so resolve the matching user record by clerk id.
    const tutorUser = await this.userRepository.findOne({
      where: { clerkId: booking.tutor.clerkId },
    });
    if (!tutorUser) throw new NotFoundException('Tutor profile not found');

    const existing = await this.reviewRepository.findOne({
      where: {
        booking: { id: booking.id },
        learner: { id: learner.id },
        deletedAt: IsNull(),
      },
      relations: ['booking', 'learner'],
    });
    if (existing) {
      throw new ConflictException('Ya has calificado esta sesión');
    }

    const review = this.reviewRepository.create({
      booking,
      learner,
      tutor: tutorUser,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });

    const saved = await this.reviewRepository.save(review);
    return this.toResponse(saved, booking.id);
  }

  /**
   * Returns every review submitted by the authenticated learner across all of
   * their bookings. Used by the sessions list to mark already-rated cards
   * without issuing one request per card.
   *
   * @throws NotFoundException when the learner cannot be resolved.
   */
  async getMyReviews(
    learnerClerkId: string,
  ): Promise<ReviewResponseDto[]> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const reviews = await this.reviewRepository.find({
      where: { learner: { id: learner.id } },
      relations: ['booking'],
      order: { createdAt: 'DESC' },
    });

    return reviews.map((r) => this.toResponse(r, r.booking.id));
  }

  /**
   * Returns the review submitted by the authenticated learner for the given
   * booking, or {@code null} when no review exists.
   *
   * @throws NotFoundException  when the booking or learner cannot be resolved.
   * @throws ForbiddenException when the booking does not belong to the learner.
   */
  async getReviewForBooking(
    learnerClerkId: string,
    bookingId: string,
  ): Promise<ReviewResponseDto | null> {
    const learner = await this.userRepository.findOne({
      where: { clerkId: learnerClerkId },
    });
    if (!learner) throw new NotFoundException('Learner profile not found');

    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['student'],
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    if (!booking.student || booking.student.id !== learner.id) {
      throw new ForbiddenException('Acceso denegado');
    }

    const review = await this.reviewRepository.findOne({
      where: {
        booking: { id: bookingId },
        learner: { id: learner.id },
        deletedAt: IsNull(),
      },
      relations: ['booking'],
    });

    return review ? this.toResponse(review, bookingId) : null;
  }

  /**
   * Returns an aggregate review summary for the authenticated tutor:
   * average rating, total count, distribution per star, and 5 most recent reviews.
   *
   * @author TutorConnect Team
   * @version 1.0
   * @since 2026-05-13
   */
  async getTutorReviewSummary(tutorClerkId: string): Promise<TutorReviewSummaryDto> {
    const tutor = await this.userRepository.findOne({ where: { clerkId: tutorClerkId } });
    if (!tutor) throw new NotFoundException('Tutor profile not found');

    const reviews = await this.reviewRepository.find({
      where: { tutor: { id: tutor.id }, deletedAt: IsNull() },
      relations: ['learner', 'booking', 'booking.course'],
      order: { createdAt: 'DESC' },
    });

    const totalReviews = reviews.length;
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let ratingSum = 0;

    for (const r of reviews) {
      ratingSum += r.rating;
      distribution[String(r.rating)] = (distribution[String(r.rating)] ?? 0) + 1;
    }

    const averageRating =
      totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

    const recentReviews = reviews.slice(0, 5).map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      learnerName: `${r.learner.firstName} ${r.learner.lastName}`,
      subject: r.booking?.course?.subject ?? r.booking?.subject ?? '',
      createdAt: r.createdAt,
    }));

    return { averageRating, totalReviews, ratingDistribution: distribution, recentReviews };
  }

  private toResponse(review: ReviewEntity, bookingId: string): ReviewResponseDto {
    return {
      id: review.id,
      bookingId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    };
  }
}
