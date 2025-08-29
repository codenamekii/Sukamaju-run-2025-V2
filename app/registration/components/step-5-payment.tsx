// app/registration/components/step-5-payment.tsx
'use client';

import type { Snap } from '@/components/registration/payment-modal';
import { calculateIndividualPrice } from '@/lib/config/pricing';
import { AlertCircle, ArrowLeft, Clock, CreditCard } from 'lucide-react';
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

  // Calculate pricing

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
    try {
      setIsSubmitting(true);
      setError('');

      // Prepare data for API
      const registrationData = {
        // Personal Info
        fullName: formData.personalInfo.fullName,
        gender: formData.personalInfo.gender,
        dateOfBirth: formData.personalInfo.dateOfBirth,
        idNumber: formData.personalInfo.idNumber,
        bloodType: formData.emergencyContact.bloodType || '',

        // Contact Info
        email: formData.personalInfo.email,
        whatsapp: formData.personalInfo.whatsapp,
        address: formData.personalInfo.address,
        province: formData.personalInfo.province,
        city: formData.personalInfo.city,
        postalCode: formData.personalInfo.postalCode || '',

        // Race Info
        category: formData.category,
        bibName: formData.personalInfo.bibName,
        jerseySize: formData.personalInfo.jerseySize,

        // Emergency Contact
        emergencyName: formData.emergencyContact.name,
        emergencyPhone: formData.emergencyContact.phone,
        emergencyRelation: formData.emergencyContact.relationship,
        medicalHistory: formData.emergencyContact.medicalConditions || '',
        allergies: formData.emergencyContact.allergies || '',
        medications: formData.emergencyContact.medications || ''
      };

      console.log('Submitting registration:', registrationData);

      // Call Registration API
      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();
      console.log('Registration response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Registration successful
      const { registrationCode, bibNumber, totalPrice } = result.data;

      // Show success message
      alert(`
        Registrasi Berhasil!
        
        Kode Registrasi: ${registrationCode}
        Nomor BIB: ${bibNumber}
        Total Pembayaran: ${formatCurrency(totalPrice)}
        
        Silakan lanjutkan ke pembayaran.
      `);

      // Try to create payment (optional - if payment API is ready)
      try {
        const paymentResponse = await fetch('/api/payment/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationCode })
        });

        const paymentResult = await paymentResponse.json();
        console.log('Payment response:', paymentResult);

        if (paymentResult.success) {
          // If using Midtrans
          if (paymentResult.token && window.snap) {
            window.snap.pay(paymentResult.token, {
              onSuccess: function () {
                router.push(`/registration/success?code=${registrationCode}`);
              },
              onPending: function () {
                router.push(`/registration/pending?code=${registrationCode}`);
              },
              onError: function () {
                alert('Payment failed. Please try again.');
              },
              onClose: function () {
                // User closed the popup without finishing payment
                router.push(`/registration/pending?code=${registrationCode}`);
              }
            });
          } else {
            // No payment gateway, just redirect to success
            router.push(`/registration/success?code=${registrationCode}`);
          }
        }
      } catch (paymentError) {
        console.log('Payment API not ready, skipping payment:', paymentError);
        // Payment API not ready, just show success
        router.push(`/registration/success?code=${registrationCode}`);
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result.data);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
      alert('Registration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Konfirmasi & Pembayaran</h2>
          <p className="text-gray-600">Periksa data Anda dan lanjutkan ke pembayaran</p>
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
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-700 mb-3">Rincian Biaya</h4>
            <div className="space-y-2">
              {pricing.breakdown.map((item: string, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item}</span>
                </div>
              ))}
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
        {/* Payment Info */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Informasi Pembayaran:</p>
              <ul className="space-y-1">
                <li>• Pembayaran berlaku 1x24 jam setelah registrasi</li>
                <li>• Tersedia berbagai metode pembayaran</li>
                <li>• Konfirmasi otomatis setelah pembayaran berhasil</li>
              </ul>
            </div>
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
            disabled={isSubmitting}
            className="flex-1 bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Konfirmasi & Lanjut Pembayaran</span>
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
// Declare Midtrans snap for TypeScript
declare global {
  interface Window {
    snap: Snap;
  }
}