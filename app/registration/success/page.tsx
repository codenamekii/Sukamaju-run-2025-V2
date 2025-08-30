"use client";

import { QRCodeService } from "@/lib/services/qrcode.service";
import { CheckCircle, Download, FileText } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface RegistrationData {
  type: "INDIVIDUAL" | "COMMUNITY";
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);

  interface CommunityMember {
    participant: {
      fullName: string;
      bibNumber: string | number;
    };
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const code = searchParams.get("code");
        const type = searchParams.get("type") || "INDIVIDUAL";

        if (!code) return;

        // Fetch registration data
        const endpoint =
          type === "COMMUNITY"
            ? `/api/registration/community?code=${code}`
            : `/api/registration?code=${code}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.success) {
          // Generate QR Code
          const qrData =
            type === "COMMUNITY"
              ? QRCodeService.generateCommunityQRData(data.data.community.id, code)
              : QRCodeService.generateParticipantQRData(data.data.participant.id, code);

          const qrUrl = await QRCodeService.generateDataURL(qrData);
          setQrCodeUrl(qrUrl);

          // Set registration data
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
            paymentCode: data.data.payment.paymentCode,
            members:
              type === "COMMUNITY"
                ? data.data.community.members.map((m: CommunityMember) => ({
                  name: m.participant.fullName,
                  bibNumber: m.participant.bibNumber.toString(),
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
  }, [searchParams]);

  const downloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `QR-${registrationData?.registrationCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ✅ Tambahkan fungsi generateETicket
  const generateETicket = (registrationData: RegistrationData, qrCodeUrl: string) => {
    const eTicketHTML = `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background: #f9fafb;
      margin: 0;
      padding: 20px;
    }
    .ticket {
      max-width: 650px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      background: linear-gradient(135deg, #16a34a, #22c55e);
      color: white;
      padding: 30px 20px;
    }
    .header h1 { margin: 0; font-size: 28px; }
    .header h2 { margin: 8px 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 0; font-size: 14px; opacity: 0.9; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      padding: 20px;
    }
    .info-item {
      padding: 12px;
      border-radius: 8px;
      background: #f1f5f9;
      font-size: 14px;
    }
    .info-item strong { color: #111827; }

    .qr-section {
      text-align: center;
      padding: 20px;
    }
    .qr-section img {
      width: 200px;
      height: 200px;
      border: 4px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .qr-section p { font-size: 12px; color: #6b7280; margin-top: 10px; }

    .footer {
      background: #f9fafb;
      padding: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    .footer p { margin: 0 0 10px; font-weight: 600; }
    .footer ul {
      list-style: none;
      padding: 0;
      margin: 0 auto;
      max-width: 400px;
      text-align: left;
      font-size: 13px;
      color: #374151;
    }
    .footer ul li {
      margin: 6px 0;
      padding-left: 18px;
      position: relative;
    }
    .footer ul li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #16a34a;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>SUKAMAJU RUN 2025</h1>
      <h2>E-TICKET</h2>
      <p>16 November 2025 - Lapangan Subiantoro, Sukamaju</p>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <strong>Kode Registrasi:</strong><br>
        <span style="font-size:16px; font-weight:700; color:#16a34a;">LKRFRL</span>
      </div>
      <div class="info-item">
        <strong>Nama:</strong><br>
        Gareth Kelley
      </div>
      <div class="info-item">
        <strong>Kategori:</strong><br>
        5K
      </div>
      <div class="info-item">
        <strong>Nomor BIB:</strong><br>
        <span style="font-weight:700; color:#dc2626;">5001</span>
      </div>
    </div>

    <div class="qr-section">
      <img src="data:image/png;base64,...(qr code)...">
      <p><small>Tunjukkan QR code ini saat pengambilan race pack</small></p>
    </div>

    <div class="footer">
      <p>PENTING:</p>
      <ul>
        <li>Bawa e-ticket ini saat pengambilan race pack</li>
        <li>Bawa KTP/identitas asli</li>
        <li>Race pack tidak dapat diwakilkan</li>
      </ul>
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([eTicketHTML], { type: "text/html" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `e-ticket-${registrationData.registrationCode}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
                {registrationData.type === "COMMUNITY"
                  ? "Registrasi komunitas Anda telah berhasil"
                  : "Pendaftaran Anda telah berhasil"}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* ... info registrasi & komunitas tetap sama ... */}

              {/* QR Code */}
              <div className="text-center">
                <h2 className="font-semibold text-lg mb-3">QR Code Registrasi</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {registrationData.type === "COMMUNITY"
                    ? "Tunjukkan QR code ini saat pengambilan race pack untuk seluruh anggota"
                    : "Simpan QR code ini untuk pengambilan race pack"}
                </p>
                {qrCodeUrl && (
                  <>
                    <Image
                      src={qrCodeUrl}
                      alt="QR Code"
                      width={200}
                      height={200}
                      className="mx-auto border-2 border-gray-300 rounded-lg"
                    />
                    <div className="mt-4 flex gap-3 justify-center">
                      <button
                        onClick={downloadQR}
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Code
                      </button>
                      <button
                        onClick={() =>
                          registrationData &&
                          generateETicket(registrationData, qrCodeUrl)
                        }
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download E-Ticket
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Instructions + Buttons tetap sama */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}