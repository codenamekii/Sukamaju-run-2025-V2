'use client';

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  Edit2,
  Percent,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Promotion {
  id: string;
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  maxUsage: number | null;
  usageCount: number;
  categories: string[];
  isActive: boolean;
  createdAt: string;
  _count: {
    usages: number;
  };
}

interface PromotionStats {
  total: number;
  active: number;
  totalUsage: number;
  totalMaxUsage: number;
}

interface PromotionFormData {
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase: number;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  maxUsage: number | null;
  categories: string[];
  isActive: boolean;
}

// 🔹 tipe filter
type FilterStatus = 'all' | 'active' | 'expired' | 'upcoming';
type FilterType = 'all' | 'PERCENTAGE' | 'FIXED';

const FILTER_STATUS_OPTIONS: FilterStatus[] = ['all', 'active', 'expired', 'upcoming'];
const FILTER_TYPE_OPTIONS: FilterType[] = ['all', 'PERCENTAGE', 'FIXED'];

function isFilterStatus(v: string): v is FilterStatus {
  return FILTER_STATUS_OPTIONS.includes(v as FilterStatus);
}
function isFilterType(v: string): v is FilterType {
  return FILTER_TYPE_OPTIONS.includes(v as FilterType);
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [, setStats] = useState<PromotionStats>({
    total: 0,
    active: 0,
    totalUsage: 0,
    totalMaxUsage: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: 0,
    minPurchase: 0,
    maxDiscount: null,
    validFrom: '',
    validUntil: '',
    maxUsage: null,
    categories: [],
    isActive: true
  });

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus !== 'all') params.append('status', filterStatus);
        if (filterType !== 'all') params.append('type', filterType);

        const response = await fetch(`/api/admin/promotions?${params}`);
        const data = await response.json();

        if (response.ok) {
          setPromotions(data.promotions);
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [filterStatus, filterType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingPromotion ? 'PATCH' : 'POST';
      const body = editingPromotion
        ? { id: editingPromotion.id, ...formData }
        : formData;

      const response = await fetch('/api/admin/promotions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json(); // ⬅️ ini yang hilang
        setPromotions((prev) => [...prev, data.promotion]);
        handleCloseModal();
      }
    } catch (error) {
      console.error('Failed to save promotion:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      const response = await fetch(`/api/admin/promotions?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPromotions((prev) => prev.filter((promo) => promo.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete promotion:', error);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      code: promotion.code,
      description: promotion.description,
      type: promotion.type,
      value: promotion.value,
      minPurchase: promotion.minPurchase,
      maxDiscount: promotion.maxDiscount,
      validFrom: promotion.validFrom.split('T')[0],
      validUntil: promotion.validUntil.split('T')[0],
      maxUsage: promotion.maxUsage,
      categories: promotion.categories,
      isActive: promotion.isActive
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
    setFormData({
      code: '',
      description: '',
      type: 'PERCENTAGE',
      value: 0,
      minPurchase: 0,
      maxDiscount: null,
      validFrom: '',
      validUntil: '',
      maxUsage: null,
      categories: [],
      isActive: true
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (promotion: Promotion) => {
    const now = new Date();
    const validFrom = new Date(promotion.validFrom);
    const validUntil = new Date(promotion.validUntil);

    if (!promotion.isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <X className="w-3 h-3 mr-1" />
          Inactive
        </span>
      );
    }

    if (now < validFrom) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3 mr-1" />
          Upcoming
        </span>
      );
    }

    if (now > validUntil) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }

    if (promotion.maxUsage && promotion.usageCount >= promotion.maxUsage) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Users className="w-3 h-3 mr-1" />
          Fully Used
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions Management</h1>
          <p className="text-gray-600 mt-1">Manage discount codes and promotional campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Promotion
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => {
              const v = e.target.value;
              if (isFilterStatus(v)) setFilterStatus(v);
            }}
          >
            {FILTER_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all'
                  ? 'All Status'
                  : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => {
              const v = e.target.value;
              if (isFilterType(v)) setFilterType(v);
            }}
          >
            {FILTER_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all'
                  ? 'All Types'
                  : opt === 'PERCENTAGE'
                    ? 'Percentage'
                    : 'Fixed Amount'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading promotions...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No promotions found
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {promotion.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(promotion.code)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{promotion.description}</div>
                      {promotion.minPurchase > 0 && (
                        <div className="text-xs text-gray-500">
                          Min. purchase: {formatCurrency(promotion.minPurchase)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {promotion.type === 'PERCENTAGE' ? (
                          <>
                            <Percent className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {promotion.value}%
                            </span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(promotion.value)}
                            </span>
                          </>
                        )}
                        {promotion.maxDiscount && (
                          <span className="ml-2 text-xs text-gray-500">
                            Max: {formatCurrency(promotion.maxDiscount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(promotion.validFrom).toLocaleDateString('id-ID')}
                      </div>
                      <div className="text-xs text-gray-500">
                        to {new Date(promotion.validUntil).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {promotion.usageCount}
                        {promotion.maxUsage && ` / ${promotion.maxUsage}`}
                      </div>
                      {promotion.maxUsage && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min((promotion.usageCount / promotion.maxUsage) * 100, 100)}%`
                            }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(promotion)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(promotion)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(promotion.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Promo Code
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SAVE20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed Amount</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                      placeholder={formData.type === 'PERCENTAGE' ? '20' : '50000'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min. Purchase
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.minPurchase}
                      onChange={(e) => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid From
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Discount (for %)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.maxDiscount || ''}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number(e.target.value) : null })}
                      placeholder="100000"
                      disabled={formData.type === 'FIXED'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Usage
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.maxUsage || ''}
                      onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Early bird discount for first 100 registrants"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingPromotion ? 'Update' : 'Create'} Promotion
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}