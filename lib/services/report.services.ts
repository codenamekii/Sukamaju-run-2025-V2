import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


/* ---------------- helper filter tanggal ---------------- */
export function getDateFilter(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom || !dateTo) return {};
  return {
    createdAt: {
      gte: new Date(dateFrom),
      lte: new Date(`${dateTo}T23:59:59`),
    },
  };
}

function getPaymentDateFilter(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom || !dateTo) return {};
  return {
    paidAt: {
      gte: new Date(dateFrom),
      lte: new Date(`${dateTo}T23:59:59`),
    },
  };
}

/* ---------------- overview report ---------------- */
export async function getOverviewReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);
  const paymentFilter = getPaymentDateFilter(dateFrom, dateTo);

  const totalParticipants = await prisma.participant.count({ where: dateFilter });
  const totalCommunities = await prisma.communityRegistration.count({ where: dateFilter });

  const registrationStatusRaw = await prisma.participant.groupBy({
    by: ['registrationStatus'],
    where: dateFilter,
    _count: { _all: true },
  });

  const registrationStatus = registrationStatusRaw.map(item => ({
    status: item.registrationStatus,
    count: item._count._all,
  }));

  const revenueStats = await prisma.payment.aggregate({
    where: { status: 'PAID', ...paymentFilter },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const totalCheckin = await prisma.racePack.count();
  const collectedCount = await prisma.racePack.count({ where: { isCollected: true } });
  const pendingCount = await prisma.racePack.count({ where: { isCollected: false } });

  return {
    summary: {
      totalParticipants,
      totalCommunities,
      totalRegistrations: totalParticipants + totalCommunities * 5,
      totalRevenue: revenueStats._sum.amount ?? 0,
      paidRegistrations: revenueStats._count._all,
      averageTicketValue: revenueStats._count._all > 0
        ? (revenueStats._sum.amount ?? 0) / revenueStats._count._all
        : 0,
    },
    registrationStatus,
    checkinStats: {
      total: totalCheckin,
      collected: collectedCount,
      pending: pendingCount,
    },
  };
}

/* ---------------- revenue report ---------------- */
export async function getRevenueReport(dateFrom: string | null, dateTo: string | null) {
  const paymentFilter = getPaymentDateFilter(dateFrom, dateTo);

  const dailyRevenueRaw = await prisma.$queryRaw<
    { date: Date; revenue: bigint; transactions: bigint }[]
  >`
    SELECT DATE("paidAt") as date,
           SUM(amount)::bigint as revenue,
           COUNT(*)::bigint as transactions
    FROM "Payment"
    WHERE status = 'PAID'
    ${dateFrom && dateTo ? Prisma.sql`AND "paidAt" BETWEEN ${dateFrom} AND ${dateTo}` : Prisma.empty}
    GROUP BY DATE("paidAt")
    ORDER BY date ASC
  `;

  const dailyRevenue = dailyRevenueRaw.map(r => ({
    date: r.date,
    revenue: Number(r.revenue),
    transactions: Number(r.transactions),
  }));

  const byPaymentMethodRaw = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where: { status: 'PAID', ...paymentFilter },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const byPaymentMethod = byPaymentMethodRaw.map(item => ({
    method: item.paymentMethod ?? 'UNKNOWN',
    count: item._count._all,
    amount: item._sum.amount ?? 0,
  }));

  return {
    summary: { totalRevenue: dailyRevenue.reduce((s, d) => s + d.revenue, 0) },
    dailyRevenue,
    byPaymentMethod,
  };
}

/* ---------------- wrapper untuk route admin ---------------- */
export const getRegistrationReport = getOverviewReport;
export const getPerformanceReport = getRevenueReport;

/* ---------------- tambahan demografi & check-in ---------------- */
export async function getDemographicsReport(dateFrom: string | null, dateTo: string | null) {
  const dateFilter = getDateFilter(dateFrom, dateTo);

  const genderRaw = await prisma.participant.groupBy({
    by: ['gender'],
    where: dateFilter,
    _count: { _all: true },
  });

  const locationRaw = await prisma.participant.groupBy({
    by: ['province'],
    where: dateFilter,
    _count: { _all: true },
  });

  return {
    gender: genderRaw.map(g => ({ gender: g.gender ?? 'UNKNOWN', count: g._count._all })),
    location: locationRaw.map(l => ({ location: l.province ?? 'UNKNOWN', count: l._count._all })),
  };
}

/* ---------------- check-in report ---------------- */
export async function getCheckInReport(dateFrom: string | null, dateTo: string | null) {
  const collected = await prisma.racePack.count({
    where: { isCollected: true, ...getDateFilter(dateFrom, dateTo) },
  });
  const pending = await prisma.racePack.count({
    where: { isCollected: false, ...getDateFilter(dateFrom, dateTo) },
  });

  return { collected, pending, total: collected + pending };
}