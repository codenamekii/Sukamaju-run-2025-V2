// app/registration/success/page.tsx
"use client";

import { CheckCircle, Download, Package, Smartphone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';

interface RegistrationData {
  participant: {
    id: string;
    fullName: string;
    email: string;
    bibNumber: string;
    category: string;
    registrationCode: string;
    jerseySize?: string;
  };
  racePack?: {
    qrCode: string;
  };
}

export default function RegistrationSuccessPage() {
  const searchParams = useSearchParams();
  const registrationCode = searchParams.get('code');
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (registrationCode) {
      fetchRegistrationData();
    }
  }, [registrationCode]);

  const fetchRegistrationData = async () => {
    try {
      const response = await fetch(`/api/registration/ticket?code=${registrationCode}`);
      if (response.ok) {
        const data = await response.json();
        setRegistrationData(data);

        // Generate QR code
        const qrCode = data.racePack?.qrCode || `BM2025-QR-${data.participant.id}-${Date.now().toString(36)}`;
        generateQRCode(qrCode);
      }
    } catch (error) {
      console.error('Failed to fetch registration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (data: string) => {
    try {
      const url = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrDataUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const downloadTicket = () => {
    if (!canvasRef.current || !registrationData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (A4 portrait ratio)
    canvas.width = 800;
    canvas.height = 1131;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header background
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(0, 0, canvas.width, 200);

    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SUKAMAJU RUN 2025', canvas.width / 2, 80);

    ctx.font = '24px Arial';
    ctx.fillText('E-TICKET', canvas.width / 2, 120);

    ctx.font = '18px Arial';
    ctx.fillText('Race Pack Collection', canvas.width / 2, 160);

    // QR Code section
    if (qrDataUrl) {
      const qrImage = new Image();
      qrImage.onload = () => {
        // QR background
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(250, 230, 300, 340);

        // Draw QR code
        ctx.drawImage(qrImage, 275, 250, 250, 250);

        // QR instruction
        ctx.fillStyle = '#6B7280';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Show this QR code at race pack collection', canvas.width / 2, 530);

        // Participant details
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Participant Details', 80, 620);

        ctx.font = '18px Arial';
        ctx.fillStyle = '#374151';

        const details = [
          ['Name', registrationData.participant.fullName],
          ['BIB Number', registrationData.participant.bibNumber || 'To be assigned'],
          ['Category', registrationData.participant.category],
          ['Registration Code', registrationData.participant.registrationCode],
          ['Jersey Size', registrationData.participant.jerseySize || 'N/A']
        ];

        let yPos = 660;
        details.forEach(([label, value]) => {
          ctx.fillStyle = '#6B7280';
          ctx.fillText(`${label}:`, 80, yPos);
          ctx.fillStyle = '#111827';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(value, 250, yPos);
          ctx.font = '18px Arial';
          yPos += 35;
        });

        // Collection info
        ctx.fillStyle = '#1E40AF';
        ctx.fillRect(0, 880, canvas.width, 3);

        ctx.fillStyle = '#111827';
        ctx.font = 'bold 20px Arial';
        ctx.fillText('Race Pack Collection', 80, 930);

        ctx.font = '16px Arial';
        ctx.fillStyle = '#374151';
        ctx.fillText('Date: 10-11 May 2025', 80, 960);
        ctx.fillText('Time: 10:00 - 18:00 WIB', 80, 985);
        ctx.fillText('Venue: Kebun Raya Bogor', 80, 1010);

        // Footer
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Please bring this e-ticket and your ID card for verification', canvas.width / 2, 1080);

        // Download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SUKAMAJU-RUN-2025-Ticket-${registrationData.participant.bibNumber || registrationData.participant.registrationCode}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      };
      qrImage.src = qrDataUrl;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!registrationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Registration data not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Message */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Registration Successful!</h1>
            <p className="text-gray-600">Your registration for SUKAMAJU RUN 2025 has been confirmed</p>
          </div>

          {/* Participant Info */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participant Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{registrationData.participant.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">BIB Number:</span>
                <span className="font-medium">{registrationData.participant.bibNumber || 'To be assigned'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{registrationData.participant.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Registration Code:</span>
                <span className="font-mono text-sm">{registrationData.participant.registrationCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* E-Ticket */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">E-Ticket for Race Pack Collection</h2>

          {/* QR Code */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="text-center">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-4" />
              )}
              <p className="text-sm text-gray-600 mb-2">Show this QR code at the collection counter</p>
              <p className="text-xs text-gray-500">Screenshot or download this ticket for offline access</p>
            </div>
          </div>

          {/* Collection Details */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Race Pack Collection
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-medium">Date:</span>
                <span className="text-blue-900">10-11 May 2025</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-medium">Time:</span>
                <span className="text-blue-900">10:00 - 18:00 WIB</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-700 font-medium">Venue:</span>
                <span className="text-blue-900">Kebun Raya Bogor</span>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Please bring this e-ticket (printed or on your phone) and a valid ID card for verification at the collection counter.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={downloadTicket}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download E-Ticket
            </button>
            <button
              onClick={() => {
                if (navigator.share && qrDataUrl) {
                  navigator.share({
                    title: 'SUKAMAJU RUN 2025 E-Ticket',
                    text: `My e-ticket for SUKAMAJU RUN 2025. BIB: ${registrationData.participant.bibNumber}`,
                    url: window.location.href
                  });
                }
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* Hidden canvas for ticket generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}