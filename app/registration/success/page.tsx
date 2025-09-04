"use client";

import { QRCodeService } from "@/lib/services/qrcode.service";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download, FileText,
  MapPin,
  Share2, Sparkles,
  Star,
  Ticket as TicketIcon,
  Trophy,
  Users
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface RegistrationData {
  type: "INDIVIDUAL" | "COMMUNITY";
  registrationCode: string;
  name: string;
  category: string;
  bibNumber?: string;
  totalPrice: number;
  paymentCode: string;
  communityName?: string;
  picName?: string;
  members?: Array<{
    name: string;
    bibNumber: string;
  }>;
}

type ApiCommunityMember = {
  fullName: string;
  bibNumber: string | number;
};

export default function ModernSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const code = searchParams.get("code");
        const type = searchParams.get("type") || "INDIVIDUAL";

        if (!code) {
          router.push("/registration");
          return;
        }

        const endpoint =
          type === "COMMUNITY"
            ? `/api/registration/community?code=${code}`
            : `/api/registration?code=${code}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success) {
          const qrData =
            type === "COMMUNITY"
              ? QRCodeService.generateCommunityQRData(data.data.community.id, code)
              : QRCodeService.generateParticipantQRData(data.data.participant.id, code);

          const qrUrl = await QRCodeService.generateDataURL(qrData);
          setQrCodeUrl(qrUrl);

          setRegistrationData({
            type: type as "INDIVIDUAL" | "COMMUNITY",
            registrationCode: code,
            name:
              type === "COMMUNITY"
                ? data.data.community.communityName
                : data.data.participant.fullName,
            category:
              type === "COMMUNITY"
                ? data.data.community.category
                : data.data.participant.category,
            bibNumber: type === "COMMUNITY" ? undefined : data.data.participant.bibNumber,
            totalPrice:
              type === "COMMUNITY"
                ? data.data.community.finalPrice
                : data.data.participant.totalPrice,
            paymentCode: data.data.payment?.paymentCode || "PAID",
            communityName: type === "COMMUNITY" ? data.data.community.communityName : undefined,
            picName: type === "COMMUNITY" ? data.data.community.picName : undefined,
            members:
              type === "COMMUNITY" && Array.isArray(data.data.members)
                ? data.data.members.map((m: ApiCommunityMember) => ({
                  name: m.fullName,
                  bibNumber: String(m.bibNumber),
                }))
                : undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching registration data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, router]);

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    setDownloadingQR(true);

    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `QR-${registrationData?.registrationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingQR(false), 1000);
  };

  const generateETicket = () => {
    if (!registrationData || !qrCodeUrl) return;

    setDownloadingTicket(true);

    const membersList = registrationData.members
      ? registrationData.members.map((m, i) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${m.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #dc2626;">${m.bibNumber}</td>
          </tr>
        `).join('')
      : '';

    const eTicketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>E-Ticket - SUKAMAJU RUN 2025</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .ticket-container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0,0,0,0.2);
    }
    .ticket-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .ticket-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: rotate 30s linear infinite;
    }
    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      position: relative;
      z-index: 1;
    }
    .event-title {
      color: white;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    .event-date {
      color: rgba(255,255,255,0.9);
      font-size: 16px;
      position: relative;
      z-index: 1;
    }
    .ticket-body {
      padding: 40px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 10px;
      border-left: 4px solid #667eea;
    }
    .info-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }
    .info-value.highlight {
      color: #667eea;
      font-size: 20px;
    }
    .qr-section {
      display: flex;
      align-items: center;
      gap: 30px;
      padding: 30px;
      background: linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%);
      border-radius: 15px;
      margin: 30px 0;
    }
    .qr-code {
      width: 180px;
      height: 180px;
      background: white;
      padding: 15px;
      border-radius: 15px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    .qr-code img {
      width: 100%;
      height: 100%;
    }
    .qr-info {
      flex: 1;
    }
    .qr-info h3 {
      font-size: 20px;
      margin-bottom: 10px;
      color: #111827;
    }
    .qr-info p {
      color: #6b7280;
      line-height: 1.6;
    }
    .members-table {
      width: 100%;
      margin-top: 20px;
      border-collapse: collapse;
    }
    .members-table th {
      background: #f3f4f6;
      padding: 10px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      border-top: 2px dashed #e5e7eb;
    }
    .important-box {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .important-title {
      color: #92400e;
      font-weight: bold;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .important-list {
      list-style: none;
      color: #92400e;
    }
    .important-list li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
    }
    .important-list li::before {
      content: '✓';
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    .event-details {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 20px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 10px;
    }
    .detail-item {
      text-align: center;
    }
    .detail-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      margin: 0 auto 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }
    .detail-label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="ticket-header">
      <div class="logo">🏃</div>
      <h1 class="event-title">SUKAMAJU RUN 2025</h1>
      <p class="event-date">16 November 2025 • Lapangan Subiantoro, Sukamaju</p>
    </div>
    
    <div class="ticket-body">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Kode Registrasi</div>
          <div class="info-value highlight">${registrationData.registrationCode}</div>
        </div>
        <div class="info-item">
          <div class="info-label">${registrationData.type === 'COMMUNITY' ? 'Nama Komunitas' : 'Nama Peserta'}</div>
          <div class="info-value">${registrationData.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Kategori Lomba</div>
          <div class="info-value">${registrationData.category}</div>
        </div>
        ${registrationData.type === 'INDIVIDUAL' ? `
        <div class="info-item">
          <div class="info-label">Nomor BIB</div>
          <div class="info-value" style="color: #dc2626;">${registrationData.bibNumber}</div>
        </div>
        ` : `
        <div class="info-item">
          <div class="info-label">Total Peserta</div>
          <div class="info-value">${registrationData.members?.length} Orang</div>
        </div>
        `}
      </div>
      
      <div class="qr-section">
        <div class="qr-code">
          <img src="${qrCodeUrl}" alt="QR Code">
        </div>
        <div class="qr-info">
          <h3>QR Code Race Pack</h3>
          <p>${registrationData.type === 'COMMUNITY'
        ? 'Tunjukkan QR code ini saat pengambilan race pack untuk seluruh anggota komunitas'
        : 'Tunjukkan QR code ini saat pengambilan race pack'}</p>
        </div>
      </div>
      
      ${registrationData.type === 'COMMUNITY' && registrationData.members ? `
      <div style="margin-top: 30px;">
        <h3 style="margin-bottom: 15px;">Daftar Anggota Komunitas</h3>
        <table class="members-table">
          <thead>
            <tr>
              <th width="50">No</th>
              <th>Nama Peserta</th>
              <th width="100">No. BIB</th>
            </tr>
          </thead>
          <tbody>
            ${membersList}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <div class="event-details">
        <div class="detail-item">
          <div class="detail-icon">📅</div>
          <div class="detail-label">Tanggal</div>
          <div class="detail-value">16 Nov 2025</div>
        </div>
        <div class="detail-item">
          <div class="detail-icon">📍</div>
          <div class="detail-label">Lokasi</div>
          <div class="detail-value">Lap. Subiantoro</div>
        </div>
        <div class="detail-item">
          <div class="detail-icon">⏰</div>
          <div class="detail-label">Start</div>
          <div class="detail-value">06:00 WIB</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="important-box">
        <div class="important-title">
          ⚠️ PENTING - Harap Dibaca
        </div>
        <ul class="important-list">
          <li>Bawa e-ticket ini (cetak/digital) saat pengambilan race pack</li>
          <li>Bawa KTP/identitas diri yang valid</li>
          <li>Race pack hanya dapat diambil oleh peserta yang bersangkutan</li>
          <li>Pengambilan race pack: 15 November 2025, 10:00-18:00 WIB</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([eTicketHTML], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `e-ticket-${registrationData.registrationCode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setTimeout(() => setDownloadingTicket(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share && registrationData) {
      navigator.share({
        title: 'SUKAMAJU RUN 2025 - Registrasi Berhasil!',
        text: `Saya sudah terdaftar di SUKAMAJU RUN 2025! Kategori ${registrationData.category}`,
        url: window.location.href
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data registrasi...</p>
        </div>
      </div>
    );
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-red-600 font-semibold">Data registrasi tidak ditemukan</p>
          <button
            onClick={() => router.push('/registration')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
          >
            Kembali ke Registrasi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 animate-bounce">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Pembayaran Berhasil!
          </h1>

          <p className="text-gray-600 text-lg">
            {registrationData.type === 'COMMUNITY'
              ? `Registrasi komunitas ${registrationData.communityName} telah dikonfirmasi`
              : 'Pendaftaran Anda telah dikonfirmasi'}
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
          {/* Left Column - QR & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* QR Code Card */}
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-4">
                  <TicketIcon className="w-6 h-6 text-blue-600" />
                </div>

                <h3 className="font-bold text-lg mb-2">QR Code Registrasi</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {registrationData.type === 'COMMUNITY'
                    ? 'Untuk pengambilan seluruh race pack'
                    : 'Untuk pengambilan race pack'}
                </p>

                {qrCodeUrl && (
                  <>
                    <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={downloadQR}
                        disabled={downloadingQR}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                        {downloadingQR ? 'Downloading...' : 'QR Code'}
                      </button>

                      <button
                        onClick={handleShare}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Download E-Ticket */}
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
              <button
                onClick={generateETicket}
                disabled={downloadingTicket}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                {downloadingTicket ? 'Generating E-Ticket...' : 'Download E-Ticket'}
              </button>
            </div>
          </div>

          {/* Middle Column - Registration Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Informasi Registrasi</h3>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  CONFIRMED
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TicketIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Kode Registrasi</p>
                    <p className="font-mono font-bold text-blue-600">{registrationData.registrationCode}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Trophy className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Kategori</p>
                    <p className="font-semibold">{registrationData.category}</p>
                  </div>
                </div>

                {registrationData.type === 'COMMUNITY' ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Total Peserta</p>
                        <p className="font-semibold">{registrationData.members?.length} orang</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">PIC</p>
                        <p className="font-semibold">{registrationData.picName}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <span className="text-red-600 font-bold text-sm">#</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Nomor BIB</p>
                      <p className="font-bold text-red-600 text-xl">{registrationData.bibNumber}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">Total Pembayaran</p>
                    <p className="text-2xl font-bold text-green-600">
                      Rp {registrationData.totalPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Event Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">16 November 2025</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Lapangan Subiantoro, Sukamaju</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Start: 06:00 WIB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Members List (Community) */}
          {/* Right Column - Members List (Community) */}
          {registrationData.type === 'COMMUNITY' && registrationData.members && (
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
                <h3 className="font-bold text-lg mb-4">Daftar Anggota Komunitas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 border-b text-sm text-gray-500">No</th>
                        <th className="px-3 py-2 border-b text-sm text-gray-500">Nama</th>
                        <th className="px-3 py-2 border-b text-sm text-gray-500">No. BIB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationData.members.map((member, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{index + 1}</td>
                          <td className="px-3 py-2 border-b">{member.name}</td>
                          <td className="px-3 py-2 border-b font-bold text-red-600">{member.bibNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div> {/* End of Grid */}
      </div> {/* End of Container */}
    </div>
  );
}