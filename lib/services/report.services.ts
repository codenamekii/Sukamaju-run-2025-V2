import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface DateFilter {
  createdAt?: {
    gte: Date;
    lte: Date;
  };
}

interface SummaryStats {
  totalParticipants: number;
  totalCommunities: number;
  totalRegistrations: number;
  totalRevenue: number;
  paidRegistrations: number;
  averageTicketValue: number;
}

interface RegistrationStatus {
  status: string;
  count: number;
}

interface CategoryDistribution {
  category: string;
  count: number;
}

interface DailyData {
  date: Date;
  count: number;
  revenue?: number;
}

interface RevenueByMethod {
  method: string;
  count: number;
  amount: number;
}

interface AgeGroup {
  age_group: string;
  count: bigint;
}

interface GenderDistribution {
  gender: string;
  count: number;
}

interface LocationDistribution {
  location: string;
  count: number;
}

type RevenueByCategoryBig = {
  category: string;
  count: bigint;
  revenue: bigint;
};


// Helper function for date filtering
export function getDateFilter(dateFrom: string | null, dateTo: string | null): DateFilter {
  if (!dateFrom || !dateTo) return {};

  return {
    createdAt: {
      gte: new Date(dateFrom),
      lte: new Date(`${dateTo}T23:59:59`)
    }
  };
}

// Overview Report Service
export async function getOverviewReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  // Total registrations
  const totalParticipants = await prisma.participant.count({
    where: dateFilter
  });

  const totalCommunities = await prisma.communityRegistration.count({
    where: dateFilter
  });

  // Registration by status
  const registrationStatusRaw = await prisma.participant.groupBy({
    by: ['registrationStatus'],
    _count: true,
    where: dateFilter
  });

  const registrationStatus: RegistrationStatus[] = registrationStatusRaw.map((item: { registrationStatus: unknown; _count: number; }) => ({
    status: item.registrationStatus,
    count: item._count
  }));

  // Revenue statistics
  const revenueStats = await prisma.payment.aggregate({
    where: {
      status: 'PAID',
      ...dateFilter
    },
    _sum: { amount: true },
    _count: true
  });

  // Category distribution
  const categoryDistributionRaw = await prisma.participant.groupBy({
    by: ['category'],
    _count: true,
    where: dateFilter
  });

  const categoryDistribution: CategoryDistribution[] = categoryDistributionRaw.map((item: { category: unknown; _count: number; }) => ({
    category: item.category,
    count: item._count
  }));

  // Daily registrations (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyRegistrationsRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as count
    FROM "Participant"
    WHERE "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const dailyRegistrations: DailyData[] = dailyRegistrationsRaw.map((item: { date: string; count: number; }) => ({
    date: item.date,
    count: Number(item.count)
  }));

  // Check-in statistics  
  const checkinStatsRaw = await prisma.racePack.aggregate({
    where: {},
    _count: {
      _all: true,
      isCollected: true
    }
  });

  const collectedCount = await prisma.racePack.count({
    where: { isCollected: true }
  });

  const pendingCount = await prisma.racePack.count({
    where: { isCollected: false }
  });

  const summary: SummaryStats = {
    totalParticipants,
    totalCommunities,
    totalRegistrations: totalParticipants + (totalCommunities * 5),
    totalRevenue: revenueStats._sum.amount || 0,
    paidRegistrations: revenueStats._count,
    averageTicketValue: revenueStats._count > 0
      ? (revenueStats._sum.amount || 0) / revenueStats._count
      : 0
  };

  return {
    summary,
    registrationStatus,
    categoryDistribution,
    dailyRegistrations,
    checkinStats: {
      total: checkinStatsRaw._count._all,
      collected: collectedCount,
      pending: pendingCount
    }
  };
}

// Registration Report Service
export async function getRegistrationReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  // Registration by type
  const byTypeRaw = await prisma.participant.groupBy({
    by: ['registrationType'],
    _count: true,
    _sum: { totalPrice: true },
    where: dateFilter
  });

  const byType = byTypeRaw.map((item: { registrationType: unknown; _count: number; _sum: { totalPrice: number; }; }) => ({
    type: item.registrationType,
    count: item._count,
    revenue: item._sum.totalPrice || 0
  }));

  // Early bird statistics
  const earlyBirdStatsRaw = await prisma.participant.groupBy({
    by: ['isEarlyBird'],
    _count: true,
    _sum: { totalPrice: true },
    where: dateFilter
  });

  const earlyBird = {
    regular: earlyBirdStatsRaw.find((e: { isEarlyBird: boolean; }) => !e.isEarlyBird)?._count || 0,
    earlyBird: earlyBirdStatsRaw.find((e: { isEarlyBird: boolean; }) => e.isEarlyBird)?._count || 0,
    savings: earlyBirdStatsRaw.map((e: { isEarlyBird: boolean; _count: number; _sum: { totalPrice: number; }; }) => ({
      isEarlyBird: e.isEarlyBird,
      count: e._count,
      revenue: e._sum.totalPrice || 0
    }))
  };

  // Jersey size distribution
  const jerseyDistributionRaw = await prisma.participant.groupBy({
    by: ['jerseySize'],
    _count: true,
    where: dateFilter
  });

  const jerseyDistribution = jerseyDistributionRaw.map((item: { jerseySize: string; _count: number; }) => ({
    size: item.jerseySize,
    count: item._count
  }));

  // Community statistics
  const communityStats = await prisma.communityRegistration.aggregate({
    where: dateFilter,
    _count: true,
    _sum: {
      totalMembers: true,
      finalPrice: true
    },
    _avg: {
      totalMembers: true
    }
  });

  // Top communities
  const topCommunities = await prisma.communityRegistration.findMany({
    where: dateFilter,
    select: {
      communityName: true,
      totalMembers: true,
      category: true,
      finalPrice: true
    },
    orderBy: { totalMembers: 'desc' },
    take: 10
  });

  return {
    byType,
    earlyBird,
    jerseyDistribution,
    communities: {
      total: communityStats._count,
      totalMembers: communityStats._sum.totalMembers || 0,
      averageSize: communityStats._avg.totalMembers || 0,
      totalRevenue: communityStats._sum.finalPrice || 0,
      topCommunities
    }
  };
}

// Revenue Report Service
export async function getRevenueReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  // Daily revenue
  let dailyRevenueQuery = `
    SELECT 
      DATE("paidAt") as date,
      SUM(amount)::bigint as revenue,
      COUNT(*)::bigint as transactions
    FROM "Payment"
    WHERE status = 'PAID'
  `;

  if (dateFrom && dateTo) {
    dailyRevenueQuery += ` AND "paidAt" BETWEEN '${dateFrom}' AND '${dateTo}'`;
  }

  dailyRevenueQuery += ` GROUP BY DATE("paidAt") ORDER BY date ASC`;

  const dailyRevenueRaw = await prisma.$queryRawUnsafe(dailyRevenueQuery) as {
    date: Date;
    revenue: bigint;
    transactions: bigint;
  }[];


  const dailyRevenue = dailyRevenueRaw.map((item: { date: Date; revenue: bigint; transactions: bigint; }) => ({
    date: item.date,
    revenue: Number(item.revenue),
    transactions: Number(item.transactions)
  }));

  // Revenue by payment method
  const byPaymentMethodRaw = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where: {
      status: 'PAID',
      ...dateFilter
    },
    _sum: { amount: true },
    _count: true
  });

  const byPaymentMethod: RevenueByMethod[] = byPaymentMethodRaw.map((item: { paymentMethod: string; _count: number; _sum: { amount: number; }; }) => ({
    method: item.paymentMethod || 'Unknown',
    count: item._count,
    amount: item._sum.amount || 0
  }));

  // Revenue by category
  let revenueByCategoryQuery = `
    SELECT 
      p.category,
      COUNT(*)::bigint as count,
      SUM(py.amount)::bigint as revenue
    FROM "Payment" py
    JOIN "Participant" p ON p.id = py."participantId"
    WHERE py.status = 'PAID'
  `;

  if (dateFrom && dateTo) {
    revenueByCategoryQuery += ` AND py."paidAt" BETWEEN '${dateFrom}' AND '${dateTo}'`;
  }

  const raw = await prisma.$queryRawUnsafe(revenueByCategoryQuery) as RevenueByCategoryBig[];

  const revenueByCategory = raw.map((item: { category: unknown; count: bigint; revenue: bigint; }) => ({
    category: item.category,
    count: Number(item.count),
    revenue: Number(item.revenue)
  }));

  // Pending payments
  const pendingPayments = await prisma.payment.aggregate({
    where: {
      status: 'PENDING',
      ...dateFilter
    },
    _sum: { amount: true },
    _count: true
  });

  // Failed payments
  const failedPayments = await prisma.payment.aggregate({
    where: {
      status: 'FAILED',
      ...dateFilter
    },
    _sum: { amount: true },
    _count: true
  });

  // Refunds
  const refunds = await prisma.payment.aggregate({
    where: {
      status: 'REFUNDED',
      ...dateFilter
    },
    _sum: { amount: true },
    _count: true
  });

  // Payment conversion rate
  const totalPayments = await prisma.payment.count({ where: dateFilter });
  const successfulPayments = await prisma.payment.count({
    where: {
      status: 'PAID',
      ...dateFilter
    }
  });

  const totalRevenue = dailyRevenue.reduce(
    (sum, d) => sum + d.revenue,
    0
  );

  const totalTransactions = dailyRevenue.reduce(
    (sum, d) => sum + d.transactions,
    0
  );

  return {
    summary: {
      totalRevenue,
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      conversionRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
      pendingAmount: pendingPayments._sum.amount || 0,
      pendingCount: pendingPayments._count,
      failedAmount: failedPayments._sum.amount || 0,
      failedCount: failedPayments._count,
      refundedAmount: refunds._sum.amount || 0,
      refundedCount: refunds._count
    },
    dailyRevenue,
    byPaymentMethod,
    byCategory: revenueByCategory
  };
}

// Demographics Report Service
export async function getDemographicsReport() {
  // Age distribution
  const ageDistributionRaw = await prisma.$queryRaw<AgeGroup[]>`
    SELECT 
      CASE 
        WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) < 20 THEN 'Under 20'
        WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 20 AND 29 THEN '20-29'
        WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 30 AND 39 THEN '30-39'
        WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 40 AND 49 THEN '40-49'
        WHEN EXTRACT(YEAR FROM AGE("dateOfBirth")) BETWEEN 50 AND 59 THEN '50-59'
        ELSE '60+'
      END as age_group,
      COUNT(*) as count
    FROM "Participant"
    GROUP BY age_group
    ORDER BY age_group
  `;

  const ageDistribution = ageDistributionRaw.map((item: { age_group: unknown; count: unknown; }) => ({
    age_group: item.age_group,
    count: Number(item.count)
  }));

  // Gender distribution
  const genderDistributionRaw = await prisma.participant.groupBy({
    by: ['gender'],
    _count: true
  });

  const genderDistribution: GenderDistribution[] = genderDistributionRaw.map((item: { gender: unknown; _count: unknown; }) => ({
    gender: item.gender,
    count: item._count
  }));

  // Location distribution
  const locationDistributionRaw = await prisma.participant.groupBy({
    by: ['province'],
    _count: true,
    orderBy: { _count: { province: 'desc' } },
    take: 10
  });

  const topProvinces: LocationDistribution[] = locationDistributionRaw.map((item: { province: unknown; _count: unknown; }) => ({
    location: item.province,
    count: item._count
  }));

  // City distribution
  const cityDistributionRaw = await prisma.participant.groupBy({
    by: ['city'],
    _count: true,
    orderBy: { _count: { city: 'desc' } },
    take: 10
  });

  const topCities: LocationDistribution[] = cityDistributionRaw.map((item: { city: string; _count: number; }) => ({
    location: item.city,
    count: item._count
  }));

  // Medical conditions
  const medicalStatsRaw = await prisma.$queryRaw<Array<{
    with_conditions: bigint;
    with_allergies: bigint;
    on_medications: bigint;
    total: bigint;
  }>>`
    SELECT 
      COUNT(CASE WHEN "medicalHistory" IS NOT NULL AND "medicalHistory" != '' THEN 1 END) as with_conditions,
      COUNT(CASE WHEN allergies IS NOT NULL AND allergies != '' THEN 1 END) as with_allergies,
      COUNT(CASE WHEN medications IS NOT NULL AND medications != '' THEN 1 END) as on_medications,
      COUNT(*) as total
    FROM "Participant"
  `;

  const medicalStats = medicalStatsRaw[0] ? {
    with_conditions: Number(medicalStatsRaw[0].with_conditions),
    with_allergies: Number(medicalStatsRaw[0].with_allergies),
    on_medications: Number(medicalStatsRaw[0].on_medications),
    total: Number(medicalStatsRaw[0].total)
  } : {
    with_conditions: 0,
    with_allergies: 0,
    on_medications: 0,
    total: 0
  };

  return {
    ageDistribution,
    genderDistribution,
    topProvinces,
    topCities,
    medicalStats
  };
}

// Check-in Report Service
export async function getCheckInReport() {
  // Check-in status
  const totalPacks = await prisma.racePack.count();
  const checkedIn = await prisma.racePack.count({
    where: { isCollected: true }
  });
  const notCheckedIn = await prisma.racePack.count({
    where: { isCollected: false }
  });

  // Check-in by category
  const checkinByCategoryRaw = await prisma.$queryRaw<Array<{
    category: string;
    total: bigint;
    checked_in: bigint;
  }>>`
    SELECT 
      p.category,
      COUNT(*)::bigint as total,
      COUNT(CASE WHEN rp."isCollected" = true THEN 1 END)::bigint as checked_in
    FROM "Participant" p
    LEFT JOIN "RacePack" rp ON p.id = rp."participantId"
    GROUP BY p.category
  `;

  const checkinByCategory = checkinByCategoryRaw.map((item: { category: unknown; total: unknown; checked_in: unknown; }) => ({
    category: item.category,
    total: Number(item.total),
    checkedIn: Number(item.checked_in)
  }));

  // Daily check-ins
  const dailyCheckinsRaw = await prisma.$queryRaw<Array<{
    date: Date;
    count: bigint;
  }>>`
    SELECT 
      DATE("collectedAt") as date,
      COUNT(*)::bigint as count
    FROM "RacePack"
    WHERE "isCollected" = true AND "collectedAt" IS NOT NULL
    GROUP BY DATE("collectedAt")
    ORDER BY date ASC
  `;

  const dailyCheckins = dailyCheckinsRaw.map((item: { date: unknown; count: unknown; }) => ({
    date: item.date,
    count: Number(item.count)
  }));

  // Peak check-in hours
  const peakHoursRaw = await prisma.$queryRaw<Array<{
    hour: number;
    count: bigint;
  }>>`
    SELECT 
      EXTRACT(HOUR FROM "collectedAt")::int as hour,
      COUNT(*)::bigint as count
    FROM "RacePack"
    WHERE "isCollected" = true AND "collectedAt" IS NOT NULL
    GROUP BY hour
    ORDER BY hour ASC
  `;

  const peakHours = peakHoursRaw.map((item: { hour: unknown; count: unknown; }) => ({
    hour: item.hour,
    count: Number(item.count)
  }));

  return {
    summary: {
      total: totalPacks,
      checkedIn,
      notCheckedIn
    },
    byCategory: checkinByCategory,
    dailyCheckins,
    peakHours
  };
}

// Performance Report Service
export async function getPerformanceReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  // Category performance
  const categoryPerformanceRaw = await prisma.participant.groupBy({
    by: ['category'],
    where: dateFilter,
    _count: true,
    _sum: { totalPrice: true },
    _avg: { totalPrice: true }
  });

  const categoryPerformance = categoryPerformanceRaw.map((item: { category: unknown; _count: unknown; _sum: { totalPrice: unknown; }; _avg: { totalPrice: unknown; }; }) => ({
    category: item.category,
    participants: item._count,
    revenue: item._sum.totalPrice || 0,
    avgPrice: item._avg.totalPrice || 0
  }));

  // Target vs achievement
  const targets = {
    participants: 5000,
    revenue: 2500000000,
    checkIns: 4500
  };

  const currentStats = await prisma.participant.count({ where: dateFilter });
  const currentRevenue = await prisma.payment.aggregate({
    where: {
      status: 'PAID',
      ...dateFilter
    },
    _sum: { amount: true }
  });
  const currentCheckIns = await prisma.racePack.count({
    where: { isCollected: true }
  });

  return {
    categoryPerformance,
    targets: {
      participants: {
        target: targets.participants,
        achieved: currentStats,
        percentage: (currentStats / targets.participants) * 100
      },
      revenue: {
        target: targets.revenue,
        achieved: currentRevenue._sum.amount || 0,
        percentage: ((currentRevenue._sum.amount || 0) / targets.revenue) * 100
      },
      checkIns: {
        target: targets.checkIns,
        achieved: currentCheckIns,
        percentage: (currentCheckIns / targets.checkIns) * 100
      }
    }
  };
}