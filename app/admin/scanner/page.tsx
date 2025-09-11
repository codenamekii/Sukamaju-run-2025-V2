// app/admin/scanner/page.tsx
"use client";

import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle,
  Package,
  RefreshCw,
  Shirt,
  Users,
  XCircle
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ScanResult {
  success: boolean;
  error?: string;
  details?: string;
  participant?: {
    id: string;
    name: string;
    bibNumber: string;
    category: string;
    jerseySize: string;
    collectedAt?: string;
  };
  racePack?: {
    qrCode: string;
    collectedAt: string;
    hasJersey: boolean;
    hasBib: boolean;
    hasGoodieBag: boolean;
  };
}

interface CollectionStats {
  total: number;
  collected: number;
  pending: number;
  lastUpdate: string;
}

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<Array<{
    id: string;
    name: string;
    bibNumber: string;
    time: string;
    success: boolean;
  }>>([]);
  const [stats, setStats] = useState<CollectionStats>({
    total: 0,
    collected: 0,
    pending: 0,
    lastUpdate: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Fetch stats on mount and every 30 seconds
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/racepacks/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          total: data.total,
          collected: data.collected,
          pending: data.pending,
          lastUpdate: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const startScanner = async () => {
    try {
      setCameraError(null);
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText: string) => {
          // Stop scanning temporarily to process
          await handleScanSuccess(decodedText);
        },
        (errorMessage: string | string[]) => {
          // Ignore continuous scan errors
          if (!errorMessage.includes('NotFoundException')) {
            console.log('QR scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setCameraError('Unable to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.error('Failed to stop scanner:', err);
    }
  };

  const handleScanSuccess = async (qrCode: string) => {
    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Play sound if you want
    playBeep();

    setLoading(true);
    setScanResult(null);

    try {
      const response = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrCode,
          collectorInfo: {
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            location: 'Race Pack Collection'
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        setScanResult({
          success: true,
          participant: data.participant,
          racePack: data.racePack
        });

        // Add to recent scans
        setRecentScans(prev => [{
          id: data.participant.id,
          name: data.participant.name,
          bibNumber: data.participant.bibNumber,
          time: new Date().toLocaleTimeString('id-ID'),
          success: true
        }, ...prev.slice(0, 9)]);

        // Update stats
        setStats(prev => ({
          ...prev,
          collected: prev.collected + 1,
          pending: prev.pending - 1
        }));

        // Auto clear after 5 seconds
        setTimeout(() => {
          setScanResult(null);
        }, 5000);

      } else {
        setScanResult({
          success: false,
          error: data.error,
          details: data.details,
          participant: data.participant
        });

        // Add to recent scans as failed
        if (data.participant) {
          setRecentScans(prev => [{
            id: Date.now().toString(),
            name: data.participant.name,
            bibNumber: data.participant.bibNumber,
            time: new Date().toLocaleTimeString('id-ID'),
            success: false
          }, ...prev.slice(0, 9)]);
        }
      }
    } catch (error) {
      setScanResult({
        success: false,
        error: 'Network error',
        details: 'Unable to connect to server. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  const playBeep = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBx');
    audio.volume = 0.5;
    audio.play().catch(() => { });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">SUKAMAJU RUN 2025</h1>
              <p className="text-xs text-gray-500">Race Pack Collection Scanner</p>
            </div>
            <button
              onClick={() => window.location.href = '/admin/dashboard/checkin'}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Manual Mode
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Collected</p>
                <p className="text-xl font-bold text-green-600">{stats.collected}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Package className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-400">
            Progress: {stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.collected / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scanner Area */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {!isScanning ? (
            <div className="p-8 text-center">
              {cameraError ? (
                <>
                  <CameraOff className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-4">{cameraError}</p>
                </>
              ) : (
                <>
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Tap to start scanning QR codes</p>
                </>
              )}
              <button
                onClick={startScanner}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Start Scanner
              </button>
            </div>
          ) : (
            <div className="relative">
              <div id="qr-reader" className="w-full"></div>
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              <button
                onClick={stopScanner}
                className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Stop Scanner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="px-4 pb-4">
          <div className={`rounded-lg p-4 ${scanResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
            }`}>
            <div className="flex items-start gap-3">
              {scanResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <p className={`font-bold ${scanResult.success ? 'text-green-900' : 'text-red-900'}`}>
                  {scanResult.success ? 'Collection Successful!' : scanResult.error}
                </p>
                {scanResult.details && (
                  <p className={`text-sm mt-1 ${scanResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {scanResult.details}
                  </p>
                )}
                {scanResult.participant && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium">{scanResult.participant.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">BIB:</span>
                      <span className="text-sm font-medium">{scanResult.participant.bibNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium">{scanResult.participant.category}</span>
                    </div>
                    {scanResult.participant.jerseySize && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jersey:</span>
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Shirt className="w-4 h-4" />
                          {scanResult.participant.jerseySize}
                        </span>
                      </div>
                    )}
                    {scanResult.participant.collectedAt && (
                      <div className="mt-2 p-2 bg-yellow-100 rounded">
                        <p className="text-xs text-yellow-800">
                          Already collected on {new Date(scanResult.participant.collectedAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {scanResult.racePack && scanResult.success && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Pack Contents:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>BIB Number</span>
                      </div>
                      {scanResult.racePack.hasJersey && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          <span>Jersey</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span>Goodie Bag</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-500">Medal (at finish)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium text-gray-900">Recent Scans</h3>
            </div>
            <div className="divide-y">
              {recentScans.map((scan, index) => (
                <div key={`${scan.id}-${index}`} className="px-3 py-2 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{scan.name}</p>
                    <p className="text-xs text-gray-500">BIB: {scan.bibNumber} • {scan.time}</p>
                  </div>
                  {scan.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}