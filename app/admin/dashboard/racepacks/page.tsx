'use client';

import {
  AlertCircle,
  Box,
  CheckCircle,
  Clock,
  Download,
  Package,
  RefreshCw,
  Search,
  Shirt,
  TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface RacePackInventory {
  category: string;
  total: number;
  distributed: number;
  remaining: number;
  withJersey: number;
  percentageCollected: number;
}

interface RacePackItems {
  hasBib: boolean;
  hasJersey: boolean;
  hasGoodieBag: boolean;
  hasMedal: boolean;
  tshirtSize: string;
  notes: string;
}

interface RecentDistribution {
  id: string;
  participantId: string;
  name: string;
  bibNumber: string;
  category: string;
  email: string;
  phone: string;
  racePackCollectedAt: string;
  collectedBy: string;
  collectorName: string | null;
  collectorPhone: string | null;
  racePackItems: RacePackItems;
}

interface PackContents {
  [key: string]: {
    items: string[];
    extras: string[];
  };
}

interface Stats {
  totalParticipants: number;
  totalDistributed: number;
  totalRemaining: number;
  totalWithJersey: number;
  overallPercentage: number;
}

export default function RacePacksPage() {
  const [inventory, setInventory] = useState<RacePackInventory[]>([]);
  const [recentDistributions, setRecentDistributions] = useState<RecentDistribution[]>([]);
  const [packContents, setPackContents] = useState<PackContents>({});
  const [stats, setStats] = useState<Stats>({
    totalParticipants: 0,
    totalDistributed: 0,
    totalRemaining: 0,
    totalWithJersey: 0,
    overallPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRacePackData();
  }, [selectedCategory, searchTerm]);

  const fetchRacePackData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/admin/racepacks?${params}`);
      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory || []);
        setRecentDistributions(data.recentDistributions || []);
        setPackContents(data.packContents || {});
        setStats(data.stats || {
          totalParticipants: 0,
          totalDistributed: 0,
          totalRemaining: 0,
          totalWithJersey: 0,
          overallPercentage: 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch race pack data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRacePackData();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '5K': 'bg-blue-500',
      '10K': 'bg-purple-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      '5K': 'bg-blue-100 text-blue-800',
      '10K': 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/admin/export?type=racepacks');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `racepacks-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Race Pack Management</h1>
          <p className="text-gray-600 mt-1">Track and manage race pack distribution</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Packs</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {stats.totalParticipants}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Distributed</p>
              <p className="text-2xl font-semibold text-green-600 mt-1">
                {stats.totalDistributed}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.overallPercentage}% Complete
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">
                {stats.totalRemaining}
              </p>
            </div>
            <Box className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">With Jersey</p>
              <p className="text-2xl font-semibold text-indigo-600 mt-1">
                {stats.totalWithJersey}
              </p>
            </div>
            <Shirt className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collection Rate</p>
              <p className="text-2xl font-semibold text-purple-600 mt-1">
                {stats.overallPercentage}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Inventory by Category */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Inventory by Category</h2>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading inventory...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {inventory.map((cat) => (
                <div key={cat.category} className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${getCategoryColor(cat.category)}`}>
                      {cat.category} Category
                    </span>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">{cat.total}</p>
                      <p className="text-xs text-gray-500">Total Participants</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Distributed
                      </span>
                      <span className="font-semibold text-green-600">
                        {cat.distributed}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                        Remaining
                      </span>
                      <span className="font-semibold text-yellow-600">
                        {cat.remaining}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Shirt className="w-4 h-4 mr-2 text-indigo-500" />
                        With Jersey
                      </span>
                      <span className="font-semibold text-indigo-600">
                        {cat.withJersey}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Collection Progress</span>
                        <span className="font-medium">{cat.percentageCollected}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`${getCategoryColor(cat.category)} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${cat.percentageCollected}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pack Contents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pack Contents by Category</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(packContents).map(([category, contents]) => (
              <div key={category} className="border rounded-lg p-6">
                <h3 className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium mb-4 ${getCategoryColor(category)}`}>
                  {category} Race Pack
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      Standard Items
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-6">
                      {contents.items.map((item, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {contents.extras.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <Box className="w-4 h-4 mr-2" />
                        Additional Items
                      </h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-6">
                        {contents.extras.map((item, idx) => (
                          <li key={idx} className="flex items-center">
                            <AlertCircle className="w-3 h-3 text-blue-500 mr-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Distributions with Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Distributions</h2>
            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="5K">5K</option>
                <option value="10K">10K</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Bib Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Collector
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Collected At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading distributions...
                  </td>
                </tr>
              ) : recentDistributions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No distributions found
                  </td>
                </tr>
              ) : (
                recentDistributions.map((distribution) => (
                  <tr key={distribution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {distribution.name}
                        </div>
                        <div className="text-xs text-gray-500">{distribution.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        #{distribution.bibNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getCategoryBadgeColor(distribution.category)}`}>
                        {distribution.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        {distribution.racePackItems.hasBib && (
                          <span className="flex items-center text-gray-600">
                            <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                            Bib
                          </span>
                        )}
                        {distribution.racePackItems.hasJersey && (
                          <span className="flex items-center text-gray-600">
                            <Shirt className="w-3 h-3 mr-1 text-blue-500" />
                            {distribution.racePackItems.tshirtSize}
                          </span>
                        )}
                        {distribution.racePackItems.hasGoodieBag && (
                          <span className="flex items-center text-gray-600">
                            <Package className="w-3 h-3 mr-1 text-purple-500" />
                            Goodie
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {distribution.collectorName || 'Self'}
                        </div>
                        {distribution.collectorPhone && (
                          <div className="text-xs text-gray-500">
                            {distribution.collectorPhone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(distribution.racePackCollectedAt)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}