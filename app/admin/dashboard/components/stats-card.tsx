"use client";

import {
  LucideIcon,
  TrendingDown,
  TrendingUp
} from "lucide-react";

export interface DashboardStats {
  totalParticipants: number;
  confirmedParticipants: number;
  pendingPayments: number;
  totalRevenue: number;
  weeklyGrowth: number;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isUp: boolean };
  color?: "blue" | "green" | "yellow" | "purple" | "red";
}

// Komponen card tunggal
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue"
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    red: "bg-red-500"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isUp ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-xs font-medium ${trend.isUp ? "text-green-500" : "text-red-500"
                  }`}
              >
                {Math.abs(trend.value)}% from last week
              </span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]
            } bg-opacity-10`}
        >
          <Icon
            className={`w-6 h-6 ${colorClasses[color as keyof typeof colorClasses].replace(
              "bg-",
              "text-"
            )
              }`}
          />
        </div>
      </div>
    </div>
  );
}