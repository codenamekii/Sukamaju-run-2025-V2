"use client";

import {
  Activity,
  CheckCircle,
  CreditCard,
  Download,
  RefreshCw,
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

import { DashboardStatsSection } from "./components/stats";
import { Activity as ActivityType, DashboardStats } from "./components/types";

// Recent Activities Component
function RecentActivities({ activities }: { activities: ActivityType[] }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "registration":
        return Users;
      case "payment":
        return CreditCard;
      case "check-in":
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
        <button className="text-sm text-blue-600 hover:text-blue-700">
          View all
        </button>
      </div>
      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${getStatusColor(activity.status)}`}
              >
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
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data untuk demo
  const mockStats: DashboardStats = {
    totalParticipants: 342,
    confirmedParticipants: 298,
    pendingPayments: 44,
    totalRevenue: 68400000,
    todayRegistrations: 12,
    weeklyGrowth: 15.3,
    categoryBreakdown: {
      "5K": 180,
      "10K": 120,
      COMMUNITY: 42
    },
    recentActivities: [
      {
        id: "1",
        type: "registration",
        description: "New registration: John Doe (5K)",
        timestamp: "2 minutes ago",
        status: "success"
      },
      {
        id: "2",
        type: "payment",
        description: "Payment confirmed: Jane Smith",
        timestamp: "15 minutes ago",
        status: "success"
      },
      {
        id: "3",
        type: "registration",
        description: "Community registration: Jakarta Runners",
        timestamp: "1 hour ago",
        status: "pending"
      },
      {
        id: "4",
        type: "check-in",
        description: "Race pack collected: Bob Wilson",
        timestamp: "2 hours ago",
        status: "success"
      },
      {
        id: "5",
        type: "payment",
        description: "Payment failed: Alice Brown",
        timestamp: "3 hours ago",
        status: "failed"
      }
    ],
    registrationTrend: [
      { date: "Mon", registrations: 45, payments: 42 },
      { date: "Tue", registrations: 52, payments: 48 },
      { date: "Wed", registrations: 38, payments: 35 },
      { date: "Thu", registrations: 65, payments: 60 },
      { date: "Fri", registrations: 72, payments: 68 },
      { date: "Sat", registrations: 89, payments: 82 },
      { date: "Sun", registrations: 56, payments: 52 }
    ],
    paymentStats: {
      total: 342,
      paid: 298,
      pending: 32,
      failed: 12
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // Use mock data for now
      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
        setRefreshing(false);
      }, 1000);

      // Real API call would be:
      // const response = await fetch('/api/admin/analytics');
      // const data = await response.json();
      // setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
      {
        name: "Community",
        value: stats.categoryBreakdown["COMMUNITY"],
        color: "#8B5CF6"
      }
    ]
    : [];

  const paymentChartData = stats
    ? [
      { name: "Paid", value: stats.paymentStats.paid, color: "#10B981" },
      { name: "Pending", value: stats.paymentStats.pending, color: "#F59E0B" },
      { name: "Failed", value: stats.paymentStats.failed, color: "#EF4444" }
    ]
    : [];

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here&apos;s what&apos;s happening with SUKAMAJU RUN
            2025
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <DashboardStatsSection stats={stats} formatCurrency={formatCurrency} />
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration Trend */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Registration Trend
            </h3>
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
                />
                <Area
                  type="monotone"
                  dataKey="payments"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Category Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
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
          </div>
        </div>
      )}

      {/* Bottom Row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <RecentActivities activities={stats.recentActivities} />
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Status</h3>
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
          </div>
        </div>
      )}
    </div>
  );
}