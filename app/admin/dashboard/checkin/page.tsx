'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  QrCode,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  UserX,
  XCircle
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Participant {
  id: string;
  registrationCode: string;
  bibNumber: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  checkinStatus: 'PENDING' | 'CHECKED_IN' | 'NO_SHOW';
  checkinTime: string | null;
  checkinNotes: string | null;
  racePackCollected: boolean;
  racePackCollectedAt: string | null;
  payment: {
    status: string;
    amount: number;
  };
  community?: {
    name: string;
    members: unknown[];
  };
  createdAt: string;
}

interface CheckinStats {
  total: number;
  checkedIn: number;
  pending: number;
  noShow: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CheckInPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<CheckinStats>({
    total: 0,
    checkedIn: 0,
    pending: 0,
    noShow: 0
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const response = await fetch(`/api/admin/checkin?${params}`);
      const data = await response.json();

      if (response.ok) {
        setParticipants(data.participants);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, filterStatus, filterCategory]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleCheckIn = async (participantId: string, action: string) => {
    try {
      setProcessingId(participantId);
      const response = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, action })
      });

      if (response.ok) {
        await fetchParticipants();
      }
    } catch (error) {
      console.error('Check-in error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchCheckIn = async () => {
    if (selectedParticipants.length === 0) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selectedParticipants,
          action: 'CHECK_IN'
        })
      });

      if (response.ok) {
        setSelectedParticipants([]);
        await fetchParticipants();
      }
    } catch (error) {
      console.error('Batch check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Checked In
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in Management</h1>
          <p className="text-gray-600 mt-1">Manage participant check-ins and race pack collection</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setScannerActive(!scannerActive)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <QrCode className="w-4 h-4 mr-2" />
            {scannerActive ? 'Close Scanner' : 'QR Scanner'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Participants</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Checked In</p>
              <p className="text-2xl font-semibold text-green-600 mt-1">{stats.checkedIn}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? `${((stats.checkedIn / stats.total) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">{stats.pending}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? `${((stats.pending / stats.total) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">No Show</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">{stats.noShow}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? `${((stats.noShow / stats.total) * 100).toFixed(1)}%` : '0%'}
              </p>
            </div>
            <UserX className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* QR Scanner Section */}
      {scannerActive && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">QR Code Scanner</h3>
            <button
              onClick={() => setScannerActive(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">QR Scanner component would be integrated here</p>
            <p className="text-sm text-gray-500 mt-2">Scan participant QR code for quick check-in</p>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, registration code, or bib number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="NO_SHOW">No Show</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="5K">5K</option>
            <option value="10K">10K</option>
          </select>

          {selectedParticipants.length > 0 && (
            <button
              onClick={handleBatchCheckIn}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Check In ({selectedParticipants.length})
            </button>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants(participants.map(p => p.id));
                      } else {
                        setSelectedParticipants([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bib / Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Race Pack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Loading participants...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No participants found
                  </td>
                </tr>
              ) : (
                participants.map((participant) => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants([...selectedParticipants, participant.id]);
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                        <div className="text-sm text-gray-500">{participant.email}</div>
                        <div className="text-xs text-gray-400">{participant.phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {participant.bibNumber || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {participant.registrationCode}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{participant.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(participant.checkinStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {formatDateTime(participant.checkinTime)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {participant.racePackCollected ? (
                        <span className="text-green-600 text-sm flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Collected
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Not Collected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        {participant.checkinStatus === 'PENDING' && (
                          <button
                            onClick={() => handleCheckIn(participant.id, 'CHECK_IN')}
                            disabled={processingId === participant.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {processingId === participant.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {participant.checkinStatus === 'CHECKED_IN' && (
                          <button
                            onClick={() => handleCheckIn(participant.id, 'UNDO_CHECK_IN')}
                            disabled={processingId === participant.id}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                          >
                            {processingId === participant.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleCheckIn(participant.id, 'MARK_NO_SHOW')}
                          disabled={processingId === participant.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {processingId === participant.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}