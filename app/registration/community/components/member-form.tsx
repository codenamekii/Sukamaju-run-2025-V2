"use client";

import { CommunityMember } from "@/lib/types/community-registration";
import { JerseySize } from "@/lib/types/registration";
import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useState } from "react";

interface MemberFormProps {
  member: CommunityMember;
  index: number;
  onChange: (index: number, field: keyof CommunityMember, value: unknown) => void;
  onRemove: (index: number) => void;
  onCopy: (index: number) => void;
  canRemove: boolean;
}

export default function MemberForm({
  member,
  index,
  onChange,
  onRemove,
  onCopy,
  canRemove
}: MemberFormProps) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 cursor-pointer hover:bg-gray-100 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">
                {member.fullName || `Member ${index + 1}`}
              </h3>
              <p className="text-sm text-gray-600">
                {member.email || "Email belum diisi"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Hapus member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(index);
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Duplikat data member"
            >
              <Copy className="w-4 h-4" />
            </button>

            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      {expanded && (
        <div className="p-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Personal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={member.fullName}
                onChange={(e) => onChange(index, "fullName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Sesuai KTP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp *
              </label>
              <input
                type="tel"
                value={member.whatsapp}
                onChange={(e) => onChange(index, "whatsapp", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="08123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={member.email}
                onChange={(e) => onChange(index, "email", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama di BIB * (Max 10 karakter)
              </label>
              <input
                type="text"
                value={member.bibName}
                onChange={(e) => onChange(index, "bibName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama di BIB"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ukuran Jersey *
              </label>
              <select
                value={member.jerseySize}
                onChange={(e) =>
                  onChange(index, "jerseySize", e.target.value as JerseySize)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL (+Rp 20.000)</option>
                <option value="XXXL">XXXL (+Rp 20.000)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Kelamin *
              </label>
              <select
                value={member.gender}
                onChange={(e) => onChange(index, "gender", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Lahir * (Min. 12 tahun)
              </label>
              <input
                type="date"
                value={member.dateOfBirth}
                onChange={(e) =>
                  onChange(index, "dateOfBirth", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. KTP *
              </label>
              <input
                type="text"
                value={member.identityNumber}
                onChange={(e) =>
                  onChange(index, "identityNumber", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="16 digit"
                maxLength={16}
              />
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2">
              <h4 className="font-semibold text-gray-800 mb-2 mt-4">
                Kontak Darurat
              </h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kontak Darurat *
              </label>
              <input
                type="text"
                value={member.emergencyName}
                onChange={(e) =>
                  onChange(index, "emergencyName", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nama kontak darurat"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Telp Darurat *
              </label>
              <input
                type="tel"
                value={member.emergencyPhone}
                onChange={(e) =>
                  onChange(index, "emergencyPhone", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="08123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hubungan
              </label>
              <select
                value={member.emergencyRelation}
                onChange={(e) =>
                  onChange(index, "emergencyRelation", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Keluarga">Keluarga</option>
                <option value="Teman">Teman</option>
                <option value="Rekan Kerja">Rekan Kerja</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Golongan Darah
              </label>
              <select
                value={member.bloodType}
                onChange={(e) =>
                  onChange(index, "bloodType", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}