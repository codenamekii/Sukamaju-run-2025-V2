"use client";

import { CheckCircle, Clock, CreditCard, Users } from "lucide-react";
import { StatCard } from "./stats-card";
import { DashboardStats } from "./types";

export function DashboardStatsSection({
  stats,
  formatCurrency,
}: {
  stats: DashboardStats;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Participants"
        value={stats.totalParticipants}
        subtitle="of 500 target"
        icon={Users}
        trend={{ value: stats.weeklyGrowth, isUp: true }}
        color="blue"
      />
      <StatCard
        title="Confirmed"
        value={stats.confirmedParticipants}
        subtitle="payments completed"
        icon={CheckCircle}
        color="green"
      />
      <StatCard
        title="Pending"
        value={stats.pendingPayments}
        subtitle="awaiting payment"
        icon={Clock}
        color="yellow"
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        subtitle="collected so far"
        icon={CreditCard}
        trend={{ value: 8.2, isUp: true }}
        color="purple"
      />
    </div>
  );
}