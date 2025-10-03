'use client';

import type { RegistrationData as PaymentRegistrationData } from '@/lib/types/payment';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  ChevronRight,
  LucideIcon,
  Smartphone,
  Store,
  Wallet
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface PaymentMethod {
  type: string;
  name: string;
  icon: LucideIcon;
  description?: string;
  banks?: Array<{
    code: string;
    name: string;
    vaPrefix?: string;
  }>;
}

const paymentMethods: PaymentMethod[] = [
  {
    type: 'bank_transfer',
    name: 'Transfer Bank',
    icon: Building2,
    description: 'Bayar melalui ATM, Internet Banking, atau Mobile Banking',
    banks: [
      { code: 'bca', name: 'BCA', vaPrefix: '8860' },
      { code: 'bni', name: 'BNI', vaPrefix: '8810' },
      { code: 'bri', name: 'BRI', vaPrefix: '8820' },
      { code: 'mandiri', name: 'Mandiri', vaPrefix: '8840' },
    ]
  },
  {
    type: 'e_wallet',
    name: 'E-Wallet',
    icon: Wallet,
    description: 'Bayar instant dengan e-wallet favorit Anda',
    banks: [
      { code: 'gopay', name: 'GoPay' },
      { code: 'shopeepay', name: 'ShopeePay' },
      { code: 'dana', name: 'DANA' },
      { code: 'ovo', name: 'OVO' },
    ]
  },
  {
    type: 'qris',
    name: 'QRIS',
    icon: Smartphone,
    description: 'Scan QR dengan aplikasi pembayaran apapun'
  },
  {
    type: 'convenience_store',
    name: 'Minimarket',
    icon: Store,
    description: 'Bayar tunai di minimarket terdekat',
    banks: [
      { code: 'indomaret', name: 'Indomaret' },
      { code: 'alfamart', name: 'Alfamart' },
    ]
  }
];

// Component that uses useSearchParams - must be wrapped in Suspense
function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [registrationData, setRegistrationData] = useState<PaymentRegistrationData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(86400); // 24 hours
  const [error, setError] = useState('');

  const registrationCode = searchParams.get('code');
  const type = (searchParams.get('type') || 'INDIVIDUAL').toUpperCase();

  useEffect(() => {
    if (!registrationCode) {
      router.push("/registration");
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        const endpoint =
          type === "COMMUNITY"
            ? `/api/registration/community?code=${registrationCode}`
            : `/api/registration?code=${registrationCode}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (!mounted) return;

        if (data.success) {
          setRegistrationData(data.data);
        } else {
          setError("Data registrasi tidak ditemukan");
        }
      } catch (err) {
        console.error("Error fetching registration:", err);
        setError("Terjadi kesalahan saat memuat data");
      }
    };

    fetchData();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [registrationCode, router, type]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    if (!registrationData) {
      setError("Data registrasi belum tersedia. Muat ulang halaman atau hubungi panitia.");
      return;
    }

    if (!selectedMethod) {
      setError('Pilih metode pembayaran');
      return;
    }

    if (
      (selectedMethod === 'bank_transfer' || selectedMethod === 'e_wallet' || selectedMethod === 'convenience_store') &&
      !selectedBank
    ) {
      setError('Pilih bank atau provider');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reg = registrationData;

      const amount = type === 'COMMUNITY'
        ? (reg.community?.finalPrice ?? 0)
        : (reg.participant?.totalPrice ?? 0);

      const paymentData = {
        participantId: reg.participant?.id ?? null,
        communityRegistrationId: reg.community?.id ?? null,
        amount,
        registrationCode,
        paymentMethod: selectedMethod,
        paymentChannel: selectedBank || selectedMethod,
      };

      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();

      if (result.success && result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        throw new Error(result.error || 'Payment creation failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data registrasi...</p>
        </div>
      </div>
    );
  }

  const totalAmount = type === 'COMMUNITY'
    ? (registrationData.community?.finalPrice ?? 0)
    : (registrationData.participant?.totalPrice ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali
          </button>
          <h1 className="text-xl font-bold">Pembayaran</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Terjadi Kesalahan</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-1">Pilih Metode Pembayaran</h2>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.type} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => { setSelectedMethod(method.type); setSelectedBank(''); setError(''); }}
                      className={`w-full p-4 flex items-center justify-between transition-colors ${selectedMethod === method.type ? 'bg-primary/5 border-primary' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-full mr-3">
                          <method.icon className="w-6 h-6 text-gray-700" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{method.name}</p>
                          {method.description && <p className="text-sm text-gray-500">{method.description}</p>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>

                    {/* Show banks if applicable */}
                    {selectedMethod === method.type && method.banks && (
                      <div className="p-4 border-t space-y-2">
                        {method.banks.map((bank) => (
                          <button
                            key={bank.code}
                            onClick={() => setSelectedBank(bank.code)}
                            className={`w-full p-3 text-left border rounded-lg ${selectedBank === bank.code ? 'border-primary bg-primary/10' : 'hover:bg-gray-50'}`}
                          >
                            {bank.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary & Time */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total Pembayaran:</p>
                <p className="text-xl font-bold">{totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 text-right">Selesaikan pembayaran dalam:</p>
                <p className="text-lg font-semibold text-red-600">{formatTime(timeLeft)}</p>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={loading || timeLeft <= 0}
              className="w-full p-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? 'Memproses...' : 'Bayar Sekarang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component
function PaymentLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Memuat halaman pembayaran...</p>
      </div>
    </div>
  );
}

// Main export - wrapped with Suspense
export default function PaymentClient() {
  return (
    <Suspense fallback={<PaymentLoading />}>
      <PaymentContent />
    </Suspense>
  );
}