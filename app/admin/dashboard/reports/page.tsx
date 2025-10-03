'use client';

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Download,
  FileText,
  MapPin,
  RefreshCw,
  Target,
  TrendingUp,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ReportData {
  type: string;
  generatedAt: string;
  data: {
    summary?: Record<string, number>;
    registrationStatus?: Array<{ status: string; count: number }>;
    categoryDistribution?: Array<{ category: string; count: number }>;
    dailyRegistrations?: Array<{ date: string; count: number }>;
    dailyRevenue?: Array<{ date: string; revenue: number; transactions: number }>;
    byPaymentMethod?: Array<{ method: string; revenue: number; count: number }>;
    ageDistribution?: Array<{ age_group: string; count: number }>;
    genderDistribution?: Array<{ gender: string; count: number }>;
    topProvinces?: Array<{ province: string; count: number }>;
    targets?: Record<string, { target: number; achieved: number; percentage: number }>;
  };
}

type ReportType = 'overview' | 'registration' | 'revenue' | 'demographics' | 'checkin' | 'performance';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('overview');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [exportLoading, setExportLoading] = useState(false);

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: BarChart3, color: 'blue' },
    { id: 'registration', name: 'Registration', icon: Users, color: 'green' },
    { id: 'revenue', name: 'Revenue', icon: DollarSign, color: 'purple' },
    { id: 'demographics', name: 'Demographics', icon: MapPin, color: 'orange' },
    { id: 'checkin', name: 'Check-in', icon: Clock, color: 'cyan' },
    { id: 'performance', name: 'Performance', icon: Target, color: 'red' }
  ];

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          type: selectedReport,
          dateFrom: dateRange.from,
          dateTo: dateRange.to
        });

        const response = await fetch(`/api/admin/reports?${params}`);
        const data = await response.json();

        if (response.ok) {
          setReportData(data);
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedReport, dateRange]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(true);
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: selectedReport,
          format,
          dateFrom: dateRange.from,
          dateTo: dateRange.to
        })
      });

      if (response.ok) {
        const data = await response.json();
        // In production, this would trigger actual file download
        console.log('Export URL:', data.downloadUrl);
        alert(`Report exported successfully as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const renderOverviewReport = () => {
    if (!reportData?.data.summary) return null;
    const summary = reportData.data.summary;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatNumber(summary.totalRegistrations || 0)}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+12.5%</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatCurrency(summary.totalRevenue || 0)}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+8.3%</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Registrations</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatNumber(summary.paidRegistrations || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {summary.totalRegistrations > 0
                    ? `${((summary.paidRegistrations / summary.totalRegistrations) * 100).toFixed(1)}% conversion`
                    : '0% conversion'}
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Ticket Value</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {formatCurrency(summary.averageTicketValue || 0)}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  <span className="text-xs text-red-600">-2.1%</span>
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <p className="text-gray-500">Chart: Daily Registrations</p>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
            <div className="space-y-3">
              {reportData.data.categoryDistribution?.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{cat.category}</span>
                    <span className="font-medium">{cat.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${reportData.data.categoryDistribution
                          ? (cat.count / reportData.data.categoryDistribution.reduce((sum, c) => sum + c.count, 0)) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registration Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportData.data.registrationStatus?.map((status) => (
              <div key={status.status} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{status.count}</p>
                <p className="text-sm text-gray-600 mt-1">{status.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRevenueReport = () => {
    if (!reportData?.data) return null;
    const data = reportData.data;

    return (
      <div className="space-y-6">
        {/* Revenue Summary */}
        {data.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(data.summary.totalRevenue || 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatNumber(data.summary.totalTransactions || 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(data.summary.averageTransactionValue || 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {(data.summary.conversionRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Revenue by Payment Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Payment Method</h3>
          <div className="space-y-3">
            {data.byPaymentMethod?.map((method) => (
              <div key={method.method} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{method.method}</span>
                    <span className="text-sm font-medium">{formatCurrency(method.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${data.summary
                          ? (method.revenue / data.summary.totalRevenue) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{method.count} transactions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDemographicsReport = () => {
    if (!reportData?.data) return null;
    const data = reportData.data;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Age Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
            <div className="space-y-2">
              {data.ageDistribution?.map((age) => (
                <div key={age.age_group} className="flex justify-between text-sm">
                  <span className="text-gray-600">{age.age_group}</span>
                  <span className="font-medium">{age.count} participants</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
            <div className="space-y-3">
              {data.genderDistribution?.map((gender) => (
                <div key={gender.gender}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {gender.gender === 'L' ? 'Male' : 'Female'}
                    </span>
                    <span className="font-medium">{gender.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${gender.gender === 'L' ? 'bg-blue-600' : 'bg-pink-600'
                        }`}
                      style={{
                        width: `${data.genderDistribution
                          ? (gender.count / data.genderDistribution.reduce((sum, g) => sum + g.count, 0)) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Provinces */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Provinces</h3>
          <div className="space-y-2">
            {data.topProvinces?.map((province, index) => (
              <div key={province.province} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <span className="text-sm text-gray-900 ml-2">{province.province}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{province.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceReport = () => {
    if (!reportData?.data.targets) return null;
    const targets = reportData.data.targets;

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Target vs Achievement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(targets).map(([key, data]) => (
            <div key={key} className="bg-white rounded-lg shadow p-6">
              <h4 className="text-sm font-medium text-gray-600 capitalize mb-4">{key}</h4>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {formatNumber(data.achieved)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-gray-600">
                      / {formatNumber(data.target)}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${Math.min(data.percentage, 100)}%` }}
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${data.percentage >= 100 ? 'bg-green-500' :
                        data.percentage >= 75 ? 'bg-blue-500' :
                          data.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                  />
                </div>
                <p className="text-center text-sm font-semibold text-gray-700">
                  {data.percentage.toFixed(1)}% Achieved
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  function fetchReport(): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchReport()}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exportLoading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id as ReportType)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${selectedReport === report.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {report.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Report Content */}
      <div>
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        ) : (
          <>
            {selectedReport === 'overview' && renderOverviewReport()}
            {selectedReport === 'revenue' && renderRevenueReport()}
            {selectedReport === 'demographics' && renderDemographicsReport()}
            {selectedReport === 'performance' && renderPerformanceReport()}
            {selectedReport === 'registration' && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center">Registration report visualization</p>
              </div>
            )}
            {selectedReport === 'checkin' && (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center">Check-in report visualization</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}