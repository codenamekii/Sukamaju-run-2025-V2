"use client";

import type { RegistrationData as PaymentRegistrationData } from '@/lib/types/payment';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  LucideIcon,
  Smartphone,
  Store,
  Wallet
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface PaymentMethod {
  type: string;
  name: string;
  icon: LucideIcon;
  description?: string;
  banks?: Array<{
    code: string;
    name: string;
    logo?: string;
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

export default function PaymentPage() {
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
          // Pastikan struktur data sesuai dengan tipe PaymentRegistrationData
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

  const formatCurrency = (amount?: number | null) => {
    const val = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handlePayment = async () => {
    // Guard: pastikan data registrasi tersedia
    if (!registrationData) {
      setError("Data registrasi belum tersedia. Muat ulang halaman atau hubungi panitia.");
      return;
    }

    if (!selectedMethod) {
      setError('Pilih metode pembayaran');
      return;
    }

    if (
      (selectedMethod === 'bank_transfer' ||
        selectedMethod === 'e_wallet' ||
        selectedMethod === 'convenience_store') &&
      !selectedBank
    ) {
      setError('Pilih bank atau provider');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ambil nilai dari registrationData yang sudah ter-guard
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
        // Redirect ke gateway pembayaran
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

  // Loading / placeholder saat data belum ada
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

  // Setelah guard di atas, registrationData pasti bukan null
  const totalAmount = type === 'COMMUNITY'
    ? (registrationData.community?.finalPrice ?? 0)
    : (registrationData.participant?.totalPrice ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </button>
            <h1 className="text-xl font-bold">Pembayaran</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Timer Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-amber-600 mr-3" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Selesaikan pembayaran dalam</p>
                <p className="text-xs text-amber-700">Registrasi akan dibatalkan jika melewati batas waktu</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-2xl text-amber-900">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
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
          {/* Left: Payment Methods */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold mb-1">Pilih Metode Pembayaran</h2>
              <p className="text-sm text-gray-600 mb-6">Pilih metode pembayaran yang paling mudah untuk Anda</p>

              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.type} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        setSelectedMethod(method.type);
                        setSelectedBank('');
                        setError('');
                      }}
                      className={`w-full p-4 flex items-center justify-between transition-colors ${selectedMethod === method.type
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${selectedMethod === method.type ? 'bg-primary/10' : 'bg-gray-100'}`}>
                          <method.icon className={`w-5 h-5 ${selectedMethod === method.type ? 'text-primary' : 'text-gray-600'}`} />
                        </div>
                        <div className="ml-4 text-left">
                          <p className="font-semibold text-gray-900">{method.name}</p>
                          {method.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{method.description}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 transition-transform ${selectedMethod === method.type ? 'rotate-90 text-primary' : 'text-gray-400'}`} />
                    </button>

                    {/* Bank/Provider Options */}
                    {selectedMethod === method.type && method.banks && (
                      <div className="border-t bg-gray-50 p-4">
                        <p className="text-sm text-gray-600 mb-3">Pilih {method.type === 'bank_transfer' ? 'Bank' : 'Provider'}:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {method.banks.map((bank) => (
                            <button
                              key={bank.code}
                              onClick={() => {
                                setSelectedBank(bank.code);
                                setError('');
                              }}
                              className={`p-3 rounded-lg border-2 transition-all ${selectedBank === bank.code
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                              <p className="font-semibold text-sm">{bank.name}</p>
                              {bank.vaPrefix && (
                                <p className="text-xs text-gray-500 mt-1">VA: {bank.vaPrefix}xxx</p>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Payment Button */}
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handlePayment}
                  disabled={!selectedMethod || loading || (
                    (selectedMethod === 'bank_transfer' || selectedMethod === 'e_wallet' || selectedMethod === 'convenience_store')
                    && !selectedBank
                  )}
                  className={`w-full py-4 rounded-lg font-semibold transition-all flex items-center justify-center ${!selectedMethod || loading || ((selectedMethod === 'bank_transfer' || selectedMethod === 'e_wallet' || selectedMethod === 'convenience_store') && !selectedBank)
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
                    }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Memproses Pembayaran...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-3" />
                      Lanjutkan Pembayaran
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Anda akan diarahkan ke halaman pembayaran yang aman
                </p>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-24">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
                <h3 className="font-bold text-white">Ringkasan Pembayaran</h3>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Registration Code */}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Kode Registrasi</p>
                    <p className="font-mono font-bold text-lg text-primary">{registrationCode}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 py-4 border-y">
                    {type === 'COMMUNITY' ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Komunitas</span>
                          <span className="font-semibold text-right">{registrationData.community?.communityName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kategori</span>
                          <span className="font-semibold">{registrationData.community?.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Jumlah Peserta</span>
                          <span className="font-semibold">{registrationData.community?.totalMembers ?? 0} orang</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Nama Peserta</span>
                          <span className="font-semibold text-right">{registrationData.participant?.fullName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Kategori</span>
                          <span className="font-semibold">{registrationData.participant?.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Nomor BIB</span>
                          <span className="font-bold text-primary">{registrationData.participant?.bibNumber}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ukuran Jersey</span>
                          <span className="font-semibold">{registrationData.participant?.jerseySize}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Price Breakdown for Individual */}
                  {type === 'INDIVIDUAL' && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Biaya Registrasi {registrationData.participant?.category}</span>
                        <span>{formatCurrency(registrationData.participant?.basePrice)}</span>
                      </div>
                      {(registrationData.participant?.jerseyAddOn ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Jersey Size {registrationData.participant?.jerseySize}</span>
                          <span>{formatCurrency(registrationData.participant?.jerseyAddOn)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-semibold">Total Pembayaran</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-semibold mb-1">Pembayaran Aman</p>
                      <p>Transaksi Anda dilindungi dengan enkripsi SSL dan diproses melalui payment gateway terpercaya.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}