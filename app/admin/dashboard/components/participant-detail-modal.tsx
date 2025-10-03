"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  Edit2,
  QrCode,
  Save,
  Send,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Participant } from "../components/types";

interface ParticipantDetailProps {
  participantId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ParticipantDetailModal({
  participantId,
  isOpen,
  onClose,
  onUpdate,
}: ParticipantDetailProps) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Participant>>({});
  const [activeTab, setActiveTab] = useState<
    "personal" | "contact" | "race" | "payment" | "emergency"
  >("personal");

  const fetchParticipantDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/participants/${participantId}`);
      if (!response.ok) throw new Error("Failed to fetch participant");
      const data: Participant = await response.json();
      setParticipant(data);
      setEditData(data);
    } catch (error) {
      console.error("Error fetching participant:", error);
      setParticipant(null);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    if (isOpen && participantId) {
      fetchParticipantDetails();
    }
  }, [isOpen, participantId, fetchParticipantDetails]);

  const handleSave = async () => {
    try {
      const response = await fetch("/api/admin/participants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: participantId, ...editData }),
      });

      if (response.ok) {
        setParticipant(editData as Participant);
        setIsEditing(false);
        onUpdate();
        alert("Data berhasil diperbarui");
      } else {
        alert("Gagal memperbarui data");
      }
    } catch {
      alert("Gagal memperbarui data");
    }
  };

  const generateQRCode = async () => {
    try {
      const response = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_QR",
          participantIds: [participantId],
        }),
      });

      if (response.ok) {
        alert("QR Code berhasil digenerate");
        fetchParticipantDetails();
      } else {
        alert("Gagal generate QR Code");
      }
    } catch {
      alert("Gagal generate QR Code");
    }
  };

  const sendWhatsApp = async () => {
    try {
      const response = await fetch("/api/admin/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          type: "CUSTOM",
          message: "Pesan kustom...",
        }),
      });

      if (response.ok) {
        alert("WhatsApp berhasil dikirim");
      } else {
        alert("Gagal mengirim WhatsApp");
      }
    } catch {
      alert("Gagal mengirim WhatsApp");
    }
  };

  if (!isOpen) return null;

  const getStatusIcon = (status?: Participant["registrationStatus"]) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "CANCELLED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Participant Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Registration Code: {participant?.registrationCode || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(participant || {});
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Status Bar */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(participant?.registrationStatus)}
                  <span className="font-medium">
                    {participant?.registrationStatus || "Unknown"}
                  </span>
                </div>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm">
                  <span className="font-medium">BIB:</span>{" "}
                  {participant?.bibNumber || "Not assigned"}
                </span>
                <span className="text-sm text-gray-500">|</span>
                <span className="text-sm">
                  <span className="font-medium">Category:</span>{" "}
                  {participant?.category || "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateQRCode}
                  disabled={!participant}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1 disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4" />
                  Generate QR
                </button>
                <button
                  onClick={sendWhatsApp}
                  disabled={!participant}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Send WA
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex gap-6 px-6">
                {["personal", "contact", "race", "payment", "emergency"].map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${activeTab === tab
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {/* personal, contact, race, payment, emergency */}
              {/* TODO: isi detail tiap tab sesuai kebutuhan */}
            </div>
          </>
        )}
      </div>
    </div>
  );
}