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
  count: number;
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
      lte: new Date(`${dateTo}T23:59:59`),
    },
  };
}

// Overview Report Service
export async function getOverviewReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  const totalParticipants = await prisma.participant.count({ where: dateFilter });
  const totalCommunities = await prisma.communityRegistration.count({ where: dateFilter });

  const registrationStatusRaw = await prisma.participant.groupBy({
    by: ['registrationStatus'],
    _count: true,
    where: dateFilter,
  });

  const registrationStatus: RegistrationStatus[] = registrationStatusRaw.map((item) => ({
    status: item.registrationStatus as string,
    count: item._count,
  }));

  const revenueStats = await prisma.payment.aggregate({
    where: { status: 'PAID', ...dateFilter },
    _sum: { amount: true },
    _count: true,
  });

  const categoryDistributionRaw = await prisma.participant.groupBy({
    by: ['category'],
    _count: true,
    where: dateFilter,
  });

  const categoryDistribution: CategoryDistribution[] = categoryDistributionRaw.map((item) => ({
    category: item.category as string,
    count: item._count,
  }));

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyRegistrationsRaw = (await prisma.$queryRawUnsafe(`
    SELECT 
      DATE("createdAt") as date,
      COUNT(*) as count
    FROM "Participant"
    WHERE "createdAt" >= '${thirtyDaysAgo.toISOString()}'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `)) as { date: Date; count: bigint }[];

  const dailyRegistrations: DailyData[] = dailyRegistrationsRaw.map((item) => ({
    date: item.date,
    count: Number(item.count),
  }));

  const checkinStatsRaw = await prisma.racePack.aggregate({
    where: {},
    _count: { _all: true, isCollected: true },
  });

  const collectedCount = await prisma.racePack.count({ where: { isCollected: true } });
  const pendingCount = await prisma.racePack.count({ where: { isCollected: false } });

  const summary: SummaryStats = {
    totalParticipants,
    totalCommunities,
    totalRegistrations: totalParticipants + totalCommunities * 5,
    totalRevenue: revenueStats._sum.amount || 0,
    paidRegistrations: revenueStats._count,
    averageTicketValue:
      revenueStats._count > 0 ? (revenueStats._sum.amount || 0) / revenueStats._count : 0,
  };

  return {
    summary,
    registrationStatus,
    categoryDistribution,
    dailyRegistrations,
    checkinStats: {
      total: checkinStatsRaw._count._all,
      collected: collectedCount,
      pending: pendingCount,
    },
  };
}

// Revenue Report Service
export async function getRevenueReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

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

  const dailyRevenueRaw = (await prisma.$queryRawUnsafe(dailyRevenueQuery)) as {
    date: Date;
    revenue: bigint;
    transactions: bigint;
  }[];

  const dailyRevenue = dailyRevenueRaw.map((item) => ({
    date: item.date,
    revenue: Number(item.revenue),
    transactions: Number(item.transactions),
  }));

  const byPaymentMethodRaw = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where: { status: 'PAID', ...dateFilter },
    _sum: { amount: true },
    _count: true,
  });

  const byPaymentMethod: RevenueByMethod[] = byPaymentMethodRaw.map((item) => ({
    method: item.paymentMethod || 'Unknown',
    count: item._count,
    amount: item._sum.amount || 0,
  }));

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

  const raw = (await prisma.$queryRawUnsafe(revenueByCategoryQuery)) as RevenueByCategoryBig[];

  const revenueByCategory = raw.map((item) => ({
    category: item.category,
    count: Number(item.count),
    revenue: Number(item.revenue),
  }));

  const pendingPayments = await prisma.payment.aggregate({
    where: { status: 'PENDING', ...dateFilter },
    _sum: { amount: true },
    _count: true,
  });

  const failedPayments = await prisma.payment.aggregate({
    where: { status: 'FAILED', ...dateFilter },
    _sum: { amount: true },
    _count: true,
  });

  const refunds = await prisma.payment.aggregate({
    where: { status: 'REFUNDED', ...dateFilter },
    _sum: { amount: true },
    _count: true,
  });

  const totalPayments = await prisma.payment.count({ where: dateFilter });
  const successfulPayments = await prisma.payment.count({
    where: { status: 'PAID', ...dateFilter },
  });

  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalTransactions = dailyRevenue.reduce((sum, d) => sum + d.transactions, 0);

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
      refundedCount: refunds._count,
    },
    dailyRevenue,
    byPaymentMethod,
    byCategory: revenueByCategory,
  };
}