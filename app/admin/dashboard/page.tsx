// app/admin/dashboard/page.tsx
"use client";

import {
  Activity,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Activity as ActivityType, StatsResponse } from "./types";

// Stats Card Component
function StatCard({
  value,
  subtitle,
  icon: Icon,
  trend,
  color
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: { value: number; isUp: boolean };
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// Recent Activities Component
function RecentActivities({ activities }: { activities: ActivityType[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "registration":
        return Users;
      case "payment":
        return CreditCard;
      case "checkin":
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent Activities</h3>
        <button
          onClick={() => window.location.href = '/admin/dashboard/participants'}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          View all
        </button>
      </div>
      {activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No recent activities</p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data: StatsResponse = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(amount);

  const pieChartData = stats
    ? [
      { name: "5K", value: stats.categoryBreakdown["5K"], color: "#3B82F6" },
      { name: "10K", value: stats.categoryBreakdown["10K"], color: "#10B981" },
      { name: "Community", value: stats.categoryBreakdown["COMMUNITY"], color: "#8B5CF6" }
    ].filter(item => item.value > 0)
    : [];

  const paymentChartData = stats
    ? [
      { name: "Success", value: stats.paymentStats.success, color: "#10B981" },
      { name: "Pending", value: stats.paymentStats.pending, color: "#F59E0B" },
      { name: "Failed", value: stats.paymentStats.failed, color: "#EF4444" },
      { name: "Expired", value: stats.paymentStats.expired, color: "#6B7280" }
    ].filter(item => item.value > 0)
    : [];

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/export/dashboard', {
        method: 'GET'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here&apos;s what&apos;s happening with Sukamaju Run 2025
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Participants"
          value={stats.totalParticipants}
          subtitle={`${stats.todayRegistrations} registered today`}
          icon={Users}
          trend={{ value: stats.weeklyGrowth, isUp: stats.weeklyGrowth > 0 }}
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
          trend={{ value: stats.monthlyGrowth, isUp: stats.monthlyGrowth > 0 }}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Registration Trend (Last 7 Days)
          </h3>
          {stats.registrationTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Registrations"
                />
                <Area
                  type="monotone"
                  dataKey="payments"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Successful Payments"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Category Distribution
          </h3>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No participants yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <RecentActivities activities={stats.recentActivities} />
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
          {paymentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={paymentChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8">
                  {paymentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              No payment data yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}