"use client";

import { QRCodeService } from '@/lib/services/qrcode.service';
import { CheckCircle, Download, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface RegistrationData {
  type: 'INDIVIDUAL' | 'COMMUNITY';
  registrationCode: string;
  name: string;
  category: string;
  bibNumber?: string;
  totalPrice: number;
  paymentCode: string;
  members?: Array<{
    name: string;
    bibNumber: string;
  }>;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const code = searchParams.get('code');
        const type = searchParams.get('type') || 'INDIVIDUAL';

        if (!code) return;

        // Fetch registration data
        const endpoint = type === 'COMMUNITY'
          ? `/api/registration/community?code=${code}`
          : `/api/registration?code=${code}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success) {
          // Generate QR Code
          const qrData = type === 'COMMUNITY'
            ? QRCodeService.generateCommunityQRData(data.data.community.id, code)
            : QRCodeService.generateParticipantQRData(data.data.participant.id, code);

          const qrUrl = await QRCodeService.generateDataURL(qrData);
          setQrCodeUrl(qrUrl);

          // Set registration data
          setRegistrationData({
            type: type as 'INDIVIDUAL' | 'COMMUNITY',
            registrationCode: code,
            name: type === 'COMMUNITY' ? data.data.community.communityName : data.data.participant.fullName,
            category: type === 'COMMUNITY' ? data.data.community.category : data.data.participant.category,
            bibNumber: type === 'COMMUNITY' ? undefined : data.data.participant.bibNumber,
            totalPrice: type === 'COMMUNITY' ? data.data.community.finalPrice : data.data.participant.totalPrice,
            paymentCode: data.data.payment.paymentCode,
            members: type === 'COMMUNITY' ? data.data.community.members.map((m: any) => ({
              name: m.participant.fullName,
              bibNumber: m.participant.bibNumber
            })) : undefined
          });
        }
      } catch (error) {
        console.error('Error fetching registration data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams]);

  const downloadQR = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR-${registrationData?.registrationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Data registrasi tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Registrasi Berhasil!</h1>
              <p className="text-green-100">
                {registrationData.type === 'COMMUNITY'
                  ? 'Registrasi komunitas Anda telah berhasil'
                  : 'Pendaftaran Anda telah berhasil'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Registration Info */}
              <div className="border-b pb-4">
                <h2 className="font-semibold text-lg mb-3">Informasi Registrasi</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kode Registrasi:</span>
                    <span className="font-mono font-bold">{registrationData.registrationCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama:</span>
                    <span className="font-semibold">{registrationData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kategori:</span>
                    <span className="font-semibold">{registrationData.category}</span>
                  </div>
                  {registrationData.bibNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nomor BIB:</span>
                      <span className="font-bold text-primary">{registrationData.bibNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pembayaran:</span>
                    <span className="font-bold text-lg text-primary">
                      Rp {registrationData.totalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Community Members */}
              {registrationData.type === 'COMMUNITY' && registrationData.members && (
                <div className="border-b pb-4">
                  <h2 className="font-semibold text-lg mb-3 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Anggota Komunitas ({registrationData.members.length} orang)
                  </h2>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {registrationData.members.map((member, index) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span>{index + 1}. {member.name}</span>
                        <span className="font-mono text-gray-600">{member.bibNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="text-center">
                <h2 className="font-semibold text-lg mb-3">QR Code Registrasi</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {registrationData.type === 'COMMUNITY'
                    ? 'Tunjukkan QR code ini saat pengambilan race pack untuk seluruh anggota'
                    : 'Simpan QR code ini untuk pengambilan race pack'}
                </p>
                {qrCodeUrl && (
                  <>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="mx-auto border-2 border-gray-300 rounded-lg"
                    />
                    <button
                      onClick={downloadQR}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download QR Code
                    </button>
                  </>
                )}
              </div>

              {/* Payment Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">Instruksi Pembayaran</h3>
                <p className="text-sm text-yellow-700">
                  Silakan lakukan pembayaran dalam 24 jam dengan kode pembayaran:
                </p>
                <p className="font-mono font-bold text-lg text-yellow-800 mt-2">
                  {registrationData.paymentCode}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => window.location.href = '/payment/pending'}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Lihat Status Pembayaran
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Anda akan menerima email konfirmasi di alamat email yang terdaftar.</p>
            <p className="mt-2">
              Ada pertanyaan? Hubungi kami di{' '}
              <a href="https://wa.me/628123456789" className="text-primary hover:underline">
                WhatsApp
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}