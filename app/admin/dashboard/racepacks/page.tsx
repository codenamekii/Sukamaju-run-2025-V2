'use client';

import {
  Box,
  CheckCircle,
  Clock,
  Download,
  Package,
  Shirt,
  TrendingUp
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface RacePackInventory {
  category: string;
  total: number;
  distributed: number;
  remaining: number;
}

interface RecentDistribution {
  id: string;
  name: string;
  bibNumber: string;
  category: string;
  racePackCollectedAt: string;
  racePackItems: {
    items: string[];
    tshirtSize: string;
    notes: string;
  };
}

interface PackContents {
  [key: string]: {
    items: string[];
    extras: string[];
  };
}

export default function RacePacksPage() {
  const [inventory, setInventory] = useState<RacePackInventory[]>([]);
  const [recentDistributions, setRecentDistributions] = useState<RecentDistribution[]>([]);
  const [packContents, setPackContents] = useState<PackContents>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  useEffect(() => {
    fetchRacePackData();
  }, []);

  const fetchRacePackData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/racepacks');
      const data = await response.json();

      if (response.ok) {
        setInventory(data.inventory);
        setRecentDistributions(data.recentDistributions);
        setPackContents(data.packContents);
      }
    } catch (error) {
      console.error('Failed to fetch race pack data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPack = async (participantId: string, items: string[], tshirtSize: string) => {
    try {
      const response = await fetch('/api/admin/racepacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          items,
          tshirtSize,
          notes: ''
        })
      });

      if (response.ok) {
        await fetchRacePackData();
        setShowCollectionModal(false);
      }
    } catch (error) {
      console.error('Failed to collect race pack:', error);
    }
  };

  const calculateDistributionRate = () => {
    const total = inventory.reduce((sum, cat) => sum + cat.total, 0);
    const distributed = inventory.reduce((sum, cat) => sum + cat.distributed, 0);
    return total > 0 ? (distributed / total * 100).toFixed(1) : '0';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '5K': 'bg-blue-500',
      '10K': 'bg-green-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Race Pack Management</h1>
          <p className="text-gray-600 mt-1">Track and manage race pack distribution</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Packs</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {inventory.reduce((sum, cat) => sum + cat.total, 0)}
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
                {inventory.reduce((sum, cat) => sum + cat.distributed, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{calculateDistributionRate()}% Complete</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">
                {inventory.reduce((sum, cat) => sum + cat.remaining, 0)}
              </p>
            </div>
            <Box className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Collection Rate</p>
              <p className="text-2xl font-semibold text-purple-600 mt-1">
                {calculateDistributionRate()}%
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {inventory.map((cat) => (
              <div key={cat.category} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getCategoryColor(cat.category)}`}>
                    {cat.category}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{cat.total}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distributed:</span>
                    <span className="font-medium text-green-600">{cat.distributed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-medium text-yellow-600">{cat.remaining}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${cat.total > 0 ? (cat.distributed / cat.total * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              <div key={category} className="border rounded-lg p-4">
                <h3 className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium mb-3 ${getCategoryColor(category)}`}>
                  {category.replace('_', ' ')}
                </h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Standard Items:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {contents.items.map((item, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Extra Items:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {contents.extras.map((item, idx) => (
                        <li key={idx} className="flex items-center">
                          <Package className="w-3 h-3 text-blue-500 mr-2" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Distributions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Distributions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bib Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  T-Shirt Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collected At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDistributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No recent distributions
                  </td>
                </tr>
              ) : (
                recentDistributions.map((distribution) => (
                  <tr key={distribution.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{distribution.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{distribution.bibNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${getCategoryColor(distribution.category)}`}>
                        {distribution.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shirt className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {distribution.racePackItems?.tshirtSize || 'M'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400 mr-1" />
                        {new Date(distribution.racePackCollectedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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