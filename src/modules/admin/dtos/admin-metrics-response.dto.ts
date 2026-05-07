export interface UserGrowthDay {
  date: string;
  tutors: number;
  learners: number;
}

export interface SessionByDay {
  date: string;
  count: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RevenueByDay {
  date: string;
  gross: number;
  commission: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface TopTutor {
  tutorId: string;
  name: string;
  grossRevenue: number;
  commission: number;
  sessionsCount: number;
  averageRating: number | null;
}

export interface AdminMetricsResponseDto {
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  users: {
    totalTutors: number;
    totalLearners: number;
    totalUsers: number;
    newThisWeek: number;
    newThisMonth: number;
    growthByDay: UserGrowthDay[];
  };
  sessions: {
    total: number;
    completed: number;
    completionRate: number;
    byDay: SessionByDay[];
    byStatus: StatusCount[];
  };
  revenue: {
    grossTotal: number;
    commissionTotal: number;
    currency: 'COP';
    byDay: RevenueByDay[];
    byPaymentStatus: StatusCount[];
  };
  nps: {
    score: number;
    averageRating: number;
    totalReviews: number;
    distribution: RatingDistribution[];
  };
  topTutors: TopTutor[];
}
