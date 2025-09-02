'use client';

import {
  ArrowUpRight,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Payment {
  id: string;
  paymentCode: string;
  amount: number;
  paymentMethod: string | null;
  paymentChannel: string | null;
  midtransOrderId: string | null;
  vaNumber: string | null;
  status: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  participant?: {
    id: string;
    fullName: string;
    email: string;
    whatsapp: string;
    category: string;
    registrationCode: string;
  };
  communityRegistration?: {
    id: string;
    communityName: string;
    picName: string;
    picEmail: string;
    totalMembers: number;
    category: string;
  };
}

interface PaymentStats {
  total: number;
  paid: number;
  pending: number;
  failed: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingAmount: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    paid: 0,
    pending: 0,
    failed: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingAmount: 0
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
  const [filterMethod, setFilterMethod] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundData, setRefundData] = useState({
    amount: 0,
    reason: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, searchTerm, filterStatus, filterMethod, dateRange]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterMethod !== 'all') params.append('method', filterMethod);
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);

      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();

      if (response.ok) {
        setPayments(data.payments);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (paymentId: string, newStatus: string) => {
    if (!confirm(`Update payment status to ${newStatus}?`)) return;

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status: newStatus,
          notes: `Manual update to ${newStatus}`
        })
      });

      if (response.ok) {
        await fetchPayments();
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Failed to update payment:', error);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount: refundData.amount,
          reason: refundData.reason
        })
      });

      if (response.ok) {
        await fetchPayments();
        setShowRefundModal(false);
        setRefundData({ amount: 0, reason: '' });
      }
    } catch (error) {
      console.error('Failed to process refund:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: React.ElementType; class: string; label: string }> = {
      'PAID': { icon: CheckCircle, class: 'bg-green-100 text-green-800', label: 'Paid' },
      'PENDING': { icon: Clock, class: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      'FAILED': { icon: XCircle, class: 'bg-red-100 text-red-800', label: 'Failed' },
      'CANCELLED': { icon: XCircle, class: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      'REFUNDED': { icon: RotateCcw, class: 'bg-purple-100 text-purple-800', label: 'Refunded' }
    };

    const badge = badges[status] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
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

  const calculateRevenueGrowth = () => {
    // This would compare with yesterday's revenue in real implementation
    return 12.5; // Mock percentage
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all payment transactions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Revenue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(stats.totalRevenue)}
              </p>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-xs text-green-600">All time</span>
              </div>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today&apos;s Revenue</p>
              <p className="text-2xl font-semibold text-blue-600 mt-1">
                {formatCurrency(stats.todayRevenue)}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-xs text-blue-600">+{calculateRevenueGrowth()}%</span>
              </div>
            </div>
            <CreditCard className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">
                {formatCurrency(stats.pendingAmount)}
              </p>
              <p className="text-xs text-gray-500 mt-2">{stats.pending} transactions</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-purple-600 mt-1">
                {stats.total > 0 ? `${((stats.paid / stats.total) * 100).toFixed(1)}%` : '0%'}
              </p>
              <p className="text-xs text-gray-500 mt-2">{stats.paid} of {stats.total}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by code, order ID, name, or email..."
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
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
          >
            <option value="all">All Methods</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit_card">Credit Card</option>
            <option value="qris">QRIS</option>
            <option value="gopay">GoPay</option>
            <option value="ovo">OVO</option>
          </select>

          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            placeholder="From date"
          />

          <input
            type="date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            placeholder="To date"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.paymentCode}
                        </div>
                        {payment.midtransOrderId && (
                          <div className="text-xs text-gray-500">
                            Order: {payment.midtransOrderId}
                          </div>
                        )}
                        {payment.vaNumber && (
                          <div className="text-xs text-gray-500">
                            VA: {payment.vaNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {payment.participant ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.participant.fullName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {payment.participant.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            {payment.participant.category} - Individual
                          </div>
                        </div>
                      ) : payment.communityRegistration ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.communityRegistration.communityName}
                          </div>
                          <div className="text-xs text-gray-500">
                            PIC: {payment.communityRegistration.picName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {payment.communityRegistration.totalMembers} members - Community
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {payment.paymentMethod || '-'}
                      </div>
                      {payment.paymentChannel && (
                        <div className="text-xs text-gray-500">
                          {payment.paymentChannel}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatDateTime(payment.createdAt)}
                      </div>
                      {payment.paidAt && (
                        <div className="text-xs text-green-600">
                          Paid: {formatDateTime(payment.paidAt)}
                        </div>
                      )}
                      {payment.expiredAt && payment.status === 'PENDING' && (
                        <div className="text-xs text-red-600">
                          Expires: {formatDateTime(payment.expiredAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetailModal(true);
                          }}
                          className="text-gray-600 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payment.status === 'PENDING' && (
                          <button
                            onClick={() => handleStatusUpdate(payment.id, 'PAID')}
                            className="text-gray-600 hover:text-green-600"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {payment.status === 'PAID' && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setRefundData({ amount: payment.amount, reason: '' });
                              setShowRefundModal(true);
                            }}
                            className="text-gray-600 hover:text-purple-600"
                            title="Process Refund"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Code</label>
                    <p className="text-sm text-gray-900">{selectedPayment.paymentCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Method</label>
                    <p className="text-sm text-gray-900">
                      {selectedPayment.paymentMethod || '-'}
                    </p>
                  </div>
                  {selectedPayment.midtransOrderId && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Order ID</label>
                      <p className="text-sm text-gray-900">{selectedPayment.midtransOrderId}</p>
                    </div>
                  )}
                  {selectedPayment.vaNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">VA Number</label>
                      <p className="text-sm text-gray-900">{selectedPayment.vaNumber}</p>
                    </div>
                  )}
                </div>

                {selectedPayment.participant && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2 text-gray-900">{selectedPayment.participant.fullName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 text-gray-900">{selectedPayment.participant.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">WhatsApp:</span>
                        <span className="ml-2 text-gray-900">{selectedPayment.participant.whatsapp}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <span className="ml-2 text-gray-900">{selectedPayment.participant.category}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-900">{formatDateTime(selectedPayment.createdAt)}</span>
                    </div>
                    {selectedPayment.paidAt && (
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <span className="ml-2 text-gray-900">{formatDateTime(selectedPayment.paidAt)}</span>
                      </div>
                    )}
                    {selectedPayment.expiredAt && (
                      <div>
                        <span className="text-gray-500">Expires:</span>
                        <span className="ml-2 text-gray-900">{formatDateTime(selectedPayment.expiredAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPayment.status === 'PENDING' && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleStatusUpdate(selectedPayment.id, 'PAID')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedPayment.id, 'FAILED')}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Mark as Failed
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Process Refund</h2>
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundData({ amount: 0, reason: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Original Amount
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(selectedPayment.amount)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund Amount
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={refundData.amount}
                    onChange={(e) => setRefundData({ ...refundData, amount: Number(e.target.value) })}
                    max={selectedPayment.amount}
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Refund
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={refundData.reason}
                    onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                    placeholder="Enter reason for refund..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowRefundModal(false);
                      setRefundData({ amount: 0, reason: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefund}
                    disabled={!refundData.amount || !refundData.reason}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Process Refund
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}