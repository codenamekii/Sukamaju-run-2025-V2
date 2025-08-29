// app/admin/page.tsx
'use client';

import {
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Eye,
  LogOut,
  RefreshCw,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Stats {
  totalParticipants: number;
  confirmedParticipants: number;
  pendingPayments: number;
  totalRevenue: number;
  categoryBreakdown: {
    '5K': number;
    '10K': number;
    'COMMUNITY': number;
  };
}

interface Participant {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string;
  category: string;
  bibNumber: string;
  registrationCode: string;
  registrationStatus: string;
  totalPrice: number;
  createdAt: string;
  payments: Array<{
    id: string;
    status: string;
    amount: number;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/admin/stats');
      if (!statsResponse.ok) {
        if (statsResponse.status === 401) {
          router.push('/admin/login');
          return;
        }
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch participants
      const participantsResponse = await fetch('/api/admin/participants');
      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        setParticipants(participantsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (participantId: string) => {
    if (!confirm('Konfirmasi pembayaran untuk peserta ini?')) return;

    try {
      const response = await fetch('/api/admin/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId })
      });

      const result = await response.json();

      if (result.success) {
        alert('Pembayaran berhasil dikonfirmasi!');
        fetchDashboardData(); // Refresh data
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">SUKAMAJU RUN 2025</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Peserta</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalParticipants}</p>
                  <p className="text-xs text-gray-500 mt-1">dari 500 target</p>
                </div>
                <Users className="w-10 h-10 text-primary opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.confirmedParticipants}</p>
                  <p className="text-xs text-gray-500 mt-1">pembayaran lunas</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingPayments}</p>
                  <p className="text-xs text-gray-500 mt-1">menunggu bayar</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">total terkumpul</p>
                </div>
                <DollarSign className="w-10 h-10 text-primary opacity-50" />
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {stats && stats.categoryBreakdown && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Breakdown per Kategori</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.categoryBreakdown['5K'] || 0}</p>
                <p className="text-sm text-gray-600">Kategori 5K</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.categoryBreakdown['10K'] || 0}</p>
                <p className="text-sm text-gray-600">Kategori 10K</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{stats.categoryBreakdown['COMMUNITY'] || 0}</p>
                <p className="text-sm text-gray-600">Community</p>
              </div>
            </div>
          </div>
        )}

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Peserta Terbaru</h2>
              <button className="text-sm text-primary hover:text-primary/80 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          {participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kategori
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      BIB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {participant.fullName}
                          </p>
                          <p className="text-xs text-gray-500">{participant.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {participant.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {participant.bibNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${participant.registrationStatus === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : participant.registrationStatus === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                          {participant.registrationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(participant.totalPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(participant.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                        <button className="text-primary hover:text-primary/80">
                          <Eye className="w-4 h-4" />
                        </button>

                        {participant.registrationStatus === 'PENDING' && (
                          <button
                            onClick={() => handleConfirmPayment(participant.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Confirm Payment"
                          >
                            ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada peserta terdaftar</p>
              <p className="text-sm text-gray-400 mt-2">
                Peserta akan muncul di sini setelah melakukan registrasi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}