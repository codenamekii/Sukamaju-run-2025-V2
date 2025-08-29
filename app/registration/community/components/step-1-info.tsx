"use client";

import { CommunityRegistrationData } from "@/lib/types/community-registration";
import { PROVINCES } from "@/lib/types/registration";
import { AlertCircle, ArrowLeft, ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { Dispatch, useState } from "react";
import { COMMUNITY_PRICING } from "../constants/pricing";
import { formatCurrency, validateCommunityInfo } from "../utils/community-helpers";

interface Step1InfoProps {
  data: CommunityRegistrationData;
  onChange: Dispatch<React.SetStateAction<CommunityRegistrationData>>;
  onNext: () => void;
}

export default function Step1Info({ data, onChange, onNext }: Step1InfoProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    const validationErrors = validateCommunityInfo(data);
    if (validationErrors.length === 0) {
      setErrors([]);
      onNext();
    } else {
      setErrors(validationErrors);
    }
  };

  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Pricing Info Box */}
      <div className="bg-gradient-to-r from-primary to-torea-bay text-white rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">
          <Users className="inline-block mr-2" />
          Registrasi Komunitas SUKAMAJU RUN 2025
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h3 className="font-semibold mb-2">Kategori 5K</h3>
            <p className="text-2xl font-bold">{formatCurrency(COMMUNITY_PRICING['5K'].community)}</p>
            <p className="text-sm opacity-90">per orang (diskon 5%)</p>
            <p className="text-xs opacity-75">Normal: {formatCurrency(COMMUNITY_PRICING['5K'].individual)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <h3 className="font-semibold mb-2">Kategori 10K</h3>
            <p className="text-2xl font-bold">{formatCurrency(COMMUNITY_PRICING['10K'].community)}</p>
            <p className="text-sm opacity-90">per orang (diskon 5%)</p>
            <p className="text-xs opacity-75">Normal: {formatCurrency(COMMUNITY_PRICING['10K'].individual)}</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 mt-4">
          <p className="text-sm">
            <strong>Syarat:</strong> Minimal 5 peserta per komunitas • Jersey XXL/XXXL +Rp 20.000
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-primary mb-6">
          Informasi Komunitas
        </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Komunitas *
              </label>
              <input
                type="text"
                value={data.communityName}
                onChange={(e) => updateField('communityName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Contoh: Jakarta Runner Community"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori Lari *
              </label>
              <select
                value={data.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="5K">5K - {formatCurrency(COMMUNITY_PRICING['5K'].community)}/orang</option>
                <option value="10K">10K - {formatCurrency(COMMUNITY_PRICING['10K'].community)}/orang</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama PIC (Penanggung Jawab) *
              </label>
              <input
                type="text"
                value={data.picName}
                onChange={(e) => updateField('picName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama lengkap PIC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp PIC *
              </label>
              <input
                type="tel"
                value={data.picWhatsapp}
                onChange={(e) => updateField('picWhatsapp', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="08123456789"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email PIC *
              </label>
              <input
                type="email"
                value={data.picEmail}
                onChange={(e) => updateField('picEmail', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="pic@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat Komunitas/Sekretariat *
              </label>
              <textarea
                value={data.address}
                onChange={(e) => updateField('address', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Alamat lengkap untuk pengiriman race pack"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kota *
              </label>
              <input
                type="text"
                value={data.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama kota"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provinsi *
              </label>
              <select
                value={data.province}
                onChange={(e) => updateField('province', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Pilih Provinsi</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Mohon lengkapi data berikut:</p>
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Link href="/registration" className="btn-outline flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2"
          >
            Lanjutkan
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}