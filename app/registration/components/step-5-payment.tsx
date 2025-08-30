// app/registration/components/step-5-payment.tsx
'use client';

import { calculateIndividualPrice } from '@/lib/config/pricing';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Define types based on your registration form structure
interface PersonalInfo {
  fullName: string;
  gender: string;
  dateOfBirth: string;
  idNumber: string;
  email: string;
  whatsapp: string;
  address: string;
  province: string;
  city: string;
  postalCode?: string;
  bibName: string;
  jerseySize: string;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  bloodType?: string;
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
}

interface RegistrationFormData {
  category: string;
  personalInfo: PersonalInfo;
  emergencyContact: EmergencyContact;
  agreeToTerms?: boolean;
  agreeToRules?: boolean;
  agreeToLiability?: boolean;
  agreeToPrivacy?: boolean;
}

interface Step5PaymentProps {
  formData: RegistrationFormData;
  onBack?: () => void;
  onSuccess?: (data: unknown) => void;
}

export default function Step5Payment({ formData, onBack, onSuccess }: Step5PaymentProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const pricing = calculateIndividualPrice(
    formData.category as '5K' | '10K',
    formData.personalInfo.jerseySize
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('Anda harus menyetujui syarat dan ketentuan');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Prepare registration data
      const registrationData = {
        fullName: formData.personalInfo.fullName,
        gender: formData.personalInfo.gender,
        dateOfBirth: formData.personalInfo.dateOfBirth,
        idNumber: formData.personalInfo.idNumber,
        bloodType: formData.emergencyContact.bloodType || '',
        email: formData.personalInfo.email,
        whatsapp: formData.personalInfo.whatsapp,
        address: formData.personalInfo.address,
        province: formData.personalInfo.province,
        city: formData.personalInfo.city,
        postalCode: formData.personalInfo.postalCode || '',
        category: formData.category,
        bibName: formData.personalInfo.bibName,
        jerseySize: formData.personalInfo.jerseySize,
        emergencyName: formData.emergencyContact.name,
        emergencyPhone: formData.emergencyContact.phone,
        emergencyRelation: formData.emergencyContact.relationship,
        medicalHistory: formData.emergencyContact.medicalConditions || '',
        allergies: formData.emergencyContact.allergies || '',
        medications: formData.emergencyContact.medications || ''
      };

      // Submit registration
      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Registration successful - get registration code
      const { registrationCode } = result.data;

      // FLOW BARU: Redirect ke custom payment page
      // Tidak langsung ke success page
      router.push(`/registration/payment?code=${registrationCode}&type=INDIVIDUAL`);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result.data);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Konfirmasi</h2>
          <p className="text-gray-600">Periksa kembali data Anda sebelum melanjutkan ke pembayaran</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Registration Summary */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Ringkasan Registrasi</h3>

          {/* Personal Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-700 mb-2">Data Peserta</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Nama:</span>
                <p className="font-medium">{formData.personalInfo.fullName}</p>
              </div>
              <div>
                <span className="text-gray-500">Kategori:</span>
                <p className="font-medium">{formData.category}</p>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <p className="font-medium">{formData.personalInfo.email}</p>
              </div>
              <div>
                <span className="text-gray-500">WhatsApp:</span>
                <p className="font-medium">{formData.personalInfo.whatsapp}</p>
              </div>
              <div>
                <span className="text-gray-500">Nama BIB:</span>
                <p className="font-medium">{formData.personalInfo.bibName}</p>
              </div>
              <div>
                <span className="text-gray-500">Ukuran Jersey:</span>
                <p className="font-medium">{formData.personalInfo.jerseySize}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-gray-700 mb-2">Kontak Darurat</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Nama:</span>
                <p className="font-medium">{formData.emergencyContact.name}</p>
              </div>
              <div>
                <span className="text-gray-500">No. Telepon:</span>
                <p className="font-medium">{formData.emergencyContact.phone}</p>
              </div>
              <div>
                <span className="text-gray-500">Hubungan:</span>
                <p className="font-medium">{formData.emergencyContact.relationship}</p>
              </div>
              {formData.emergencyContact.bloodType && (
                <div>
                  <span className="text-gray-500">Golongan Darah:</span>
                  <p className="font-medium">{formData.emergencyContact.bloodType}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">Rincian Biaya</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Biaya Registrasi {formData.category}</span>
                <span>{formatCurrency(pricing.basePrice)}</span>
              </div>
              {pricing.jerseyAddOn > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Jersey Size {formData.personalInfo.jerseySize} (Tambahan)</span>
                  <span>{formatCurrency(pricing.jerseyAddOn)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Pembayaran</span>
                  <span className="text-lg text-primary">
                    {formatCurrency(pricing.totalPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) {
                  setError('');
                }
              }}
              className="mt-1 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
              Saya telah membaca dan menyetujui{' '}
              <a href="/terms" target="_blank" className="text-primary hover:underline">
                Syarat & Ketentuan
              </a>
              {' '}serta{' '}
              <a href="/privacy" target="_blank" className="text-primary hover:underline">
                Kebijakan Privasi
              </a>
              {' '}SUKAMAJU RUN 2025. Saya memahami bahwa biaya pendaftaran tidak dapat dikembalikan.
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !termsAccepted}
            className="flex-1 bg-primary text-white py-3 px-6 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Memproses Registrasi...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Konfirmasi & Lanjut ke Pembayaran</span>
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center">
          Setelah klik konfirmasi, Anda akan diarahkan ke halaman pembayaran untuk menyelesaikan registrasi
        </div>
      </div>
    </div>
  );
}