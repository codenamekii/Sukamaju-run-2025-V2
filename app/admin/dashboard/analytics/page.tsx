'use client';

import {
  Activity,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Eye,
  MoreVertical,
  RefreshCw,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface AnalyticsData {
  kpi: {
    registrations: { current: number; previous: number; change: number };
    revenue: { current: number; previous: number; change: number };
    conversionRate: { current: number; previous: number; change: number };
    checkInRate: { current: number; previous: number; change: number };
  };
  trends: {
    daily: Array<{ date: string; registrations: number; revenue: number }>;
    hourly: Array<{ hour: number; count: number }>;
  };
  realtime: {
    activeUsers: number;
    recentRegistrations: Array<{
      id: string;
      name: string;
      category: string;
      time: string;
    }>;
    todayStats: {
      registrations: number;
      revenue: number;
      checkIns: number;
    };
  };
  forecasts: {
    expectedRegistrations: number;
    expectedRevenue: number;
    confidence: number;
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data generation
  useEffect(() => {
    const fetchAnalytics = () => {
      // Simulate API call with mock data
      setAnalyticsData({
        kpi: {
          registrations: { current: 3247, previous: 2891, change: 12.3 },
          revenue: { current: 1623500000, previous: 1445000000, change: 12.4 },
          conversionRate: { current: 87.5, previous: 84.2, change: 3.9 },
          checkInRate: { current: 62.3, previous: 58.7, change: 6.1 }
        },
        trends: {
          daily: [
            { date: '2024-01-01', registrations: 145, revenue: 72500000 },
            { date: '2024-01-02', registrations: 189, revenue: 94500000 },
            { date: '2024-01-03', registrations: 223, revenue: 111500000 },
            { date: '2024-01-04', registrations: 198, revenue: 99000000 },
            { date: '2024-01-05', registrations: 256, revenue: 128000000 },
            { date: '2024-01-06', registrations: 234, revenue: 117000000 },
            { date: '2024-01-07', registrations: 267, revenue: 133500000 }
          ],
          hourly: [
            { hour: 0, count: 12 },
            { hour: 1, count: 8 },
            { hour: 2, count: 5 },
            { hour: 3, count: 3 },
            { hour: 4, count: 2 },
            { hour: 5, count: 4 },
            { hour: 6, count: 15 },
            { hour: 7, count: 28 },
            { hour: 8, count: 45 },
            { hour: 9, count: 67 },
            { hour: 10, count: 89 },
            { hour: 11, count: 95 },
            { hour: 12, count: 102 },
            { hour: 13, count: 98 },
            { hour: 14, count: 87 },
            { hour: 15, count: 76 },
            { hour: 16, count: 68 },
            { hour: 17, count: 72 },
            { hour: 18, count: 85 },
            { hour: 19, count: 92 },
            { hour: 20, count: 78 },
            { hour: 21, count: 56 },
            { hour: 22, count: 34 },
            { hour: 23, count: 21 }
          ]
        },
        realtime: {
          activeUsers: 127,
          recentRegistrations: [
            { id: '1', name: 'John Doe', category: '10K', time: '2 minutes ago' },
            { id: '2', name: 'Jane Smith', category: '5K', time: '5 minutes ago' },
            { id: '3', name: 'Bob Johnson', category: 'Half Marathon', time: '8 minutes ago' },
            { id: '4', name: 'Alice Brown', category: '10K', time: '12 minutes ago' },
            { id: '5', name: 'Charlie Wilson', category: '5K', time: '15 minutes ago' }
          ],
          todayStats: {
            registrations: 267,
            revenue: 133500000,
            checkIns: 145
          }
        },
        forecasts: {
          expectedRegistrations: 5000,
          expectedRevenue: 2500000000,
          confidence: 82.5
        }
      });
      setLoading(false);
    };

    fetchAnalytics();

    // Auto-refresh every 30 seconds if enabled
    const interval = autoRefresh ? setInterval(fetchAnalytics, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: amount > 1000000000 ? 'compact' : 'standard'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const renderKPICard = (
    title: string,
    value: number | string,
    change: number,
    icon: React.ElementType,
    color: string,
    format: 'number' | 'currency' | 'percentage' = 'number'
  ) => {
    const Icon = icon;
    const isPositive = change >= 0;
    const ChangeIcon = isPositive ? ChevronUp : ChevronDown;

    const formattedValue =
      format === 'currency' ? formatCurrency(value as number) :
        format === 'percentage' ? `${value}%` :
          formatNumber(value as number);

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
          <div className="flex items-center mt-2">
            <ChangeIcon className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last period</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoRefresh ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Real-time Status Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Live</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{analyticsData.realtime.activeUsers} active users</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">
                {analyticsData.realtime.todayStats.registrations} registrations today
              </span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30">
            <Eye className="w-4 h-4" />
            <span className="text-sm">View Details</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderKPICard(
          'Total Registrations',
          analyticsData.kpi.registrations.current,
          analyticsData.kpi.registrations.change,
          Users,
          'blue'
        )}
        {renderKPICard(
          'Total Revenue',
          analyticsData.kpi.revenue.current,
          analyticsData.kpi.revenue.change,
          DollarSign,
          'green',
          'currency'
        )}
        {renderKPICard(
          'Conversion Rate',
          analyticsData.kpi.conversionRate.current,
          analyticsData.kpi.conversionRate.change,
          TrendingUp,
          'purple',
          'percentage'
        )}
        {renderKPICard(
          'Check-in Rate',
          analyticsData.kpi.checkInRate.current,
          analyticsData.kpi.checkInRate.change,
          Activity,
          'orange',
          'percentage'
        )}
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Registration Trend</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Interactive Chart Area</p>
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Registrations</h3>
          <div className="space-y-3">
            {analyticsData.realtime.recentRegistrations.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{reg.name}</p>
                  <p className="text-xs text-gray-500">{reg.category} • {reg.time}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Registrations
          </button>
        </div>
      </div>

      {/* Forecasts and Predictions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Forecasts & Predictions</h3>
          <span className="text-sm text-gray-500">
            {analyticsData.forecasts.confidence}% confidence
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Expected Registrations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatNumber(analyticsData.forecasts.expectedRegistrations)}
            </p>
          </div>
          <div className="text-center">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Expected Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(analyticsData.forecasts.expectedRevenue)}
            </p>
          </div>
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Risk Assessment</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Low</p>
          </div>
        </div>
      </div>

      {/* Peak Hours Heatmap */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Activity by Hour</h3>
        <div className="grid grid-cols-24 gap-1">
          {analyticsData.trends.hourly.map((hour) => {
            const intensity = (hour.count / Math.max(...analyticsData.trends.hourly.map(h => h.count))) * 100;
            return (
              <div
                key={hour.hour}
                className="relative group"
                title={`${hour.hour}:00 - ${hour.count} registrations`}
              >
                <div
                  className={`h-8 rounded ${intensity > 75 ? 'bg-blue-600' :
                      intensity > 50 ? 'bg-blue-500' :
                        intensity > 25 ? 'bg-blue-400' :
                          intensity > 10 ? 'bg-blue-300' :
                            'bg-blue-100'
                    }`}
                />
                <span className="absolute -bottom-5 left-0 text-xs text-gray-500 hidden group-hover:block">
                  {hour.hour}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-300 rounded"></div>
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span>Peak</span>
          </div>
        </div>
      </div>
    </div>
  );
}