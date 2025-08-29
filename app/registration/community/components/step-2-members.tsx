"use client";

import {
  CommunityMember,
  CommunityPriceCalculation,
  CommunityRegistrationData,
} from "@/lib/types/community-registration";
import { AlertCircle, ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { MAX_MEMBERS, MIN_MEMBERS } from "../constants/pricing";
import {
  calculateCommunityPrice,
  emptyMember,
  validateMembers,
} from "../utils/community-helpers";
import MemberForm from "./member-form";
import PriceDisplay from "./price-display";

interface Step2MembersProps {
  data: CommunityRegistrationData;
  onChange: Dispatch<SetStateAction<CommunityRegistrationData>>;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Members({
  data,
  onChange,
  onNext,
  onBack,
}: Step2MembersProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [priceCalculation, setPriceCalculation] =
    useState<CommunityPriceCalculation | null>(null);

  // kalkulasi harga setiap ada perubahan anggota / kategori
  useEffect(() => {
    if (!data?.members || data.members.length < MIN_MEMBERS) {
      setPriceCalculation(null);
      return;
    }

    // hasil raw dari util
    const raw = calculateCommunityPrice(
      data.category as "5K" | "10K",
      data.members
    );

    // map ke tipe yang lengkap
    const mapped: CommunityPriceCalculation = {
      basePrice: raw.basePrice,
      baseMembers: raw.baseMembers ?? data.members.length,
      freeMembers: raw.freeMembers ?? 0,
      totalMembers: raw.totalMembers,
      subtotal: raw.subtotal ?? raw.totalBase ?? 0,
      jerseyAdjustments: raw.jerseyAdjustments ??
        data.members.map((m, i) => ({
          memberName: m.fullName || `Member ${i + 1}`,
          size: m.jerseySize,
          adjustment: 0,
        })),
      totalJerseyAdjustment: raw.totalJerseyAdjustment ?? raw.jerseyAddOnTotal ?? 0,
      totalPrice: raw.totalPrice,
      savings: raw.savings,
      pricePerPerson: raw.pricePerPerson,
      jerseyAddOnTotal: 0,
      totalBase: 0
    };

    setPriceCalculation(mapped);
  }, [data.members, data.category]);

  const addMember = () => {
    if (data.members.length < MAX_MEMBERS) {
      onChange({
        ...data,
        members: [...data.members, { ...emptyMember }],
      });
    }
  };

  const removeMember = (index: number) => {
    if (data.members.length > 1) {
      const newMembers = data.members.filter((_, i) => i !== index);
      onChange({
        ...data,
        members: newMembers,
      });
    }
  };

  const copyMember = (index: number) => {
    const memberToCopy = { ...data.members[index] };
    memberToCopy.fullName = "";
    memberToCopy.identityNumber = "";
    memberToCopy.email = "";
    memberToCopy.whatsapp = "";
    memberToCopy.bibName = "";

    onChange({
      ...data,
      members: [...data.members, memberToCopy],
    });
  };

  const updateMember = (
    index: number,
    field: keyof CommunityMember,
    value: unknown
  ) => {
    const newMembers = [...data.members];
    newMembers[index] = {
      ...newMembers[index],
      [field]: value,
    };
    onChange({
      ...data,
      members: newMembers,
    });
  };

  const handleSubmit = () => {
    const validationErrors = validateMembers(data.members);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    onNext();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with price */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Data Anggota Komunitas
            </h2>
            <p className="text-gray-600">
              Kategori: {data.category} • Total: {data.members.length} orang
              {data.members.length < MIN_MEMBERS && (
                <span className="text-red-600 ml-2">
                  (Minimal {MIN_MEMBERS} orang)
                </span>
              )}
            </p>
          </div>
          {priceCalculation && (
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-sm text-gray-600">Total Biaya:</p>
              <p className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(priceCalculation.totalPrice)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Mohon lengkapi data berikut:</p>
              <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-4">
        {data.members.map((member: CommunityMember, index: number) => (
          <MemberForm
            key={index}
            member={member}
            index={index}
            onChange={updateMember}
            onRemove={removeMember}
            onCopy={copyMember}
            canRemove={data.members.length > 1}
          />
        ))}

        {/* Add Member Button */}
        {data.members.length < MAX_MEMBERS && (
          <button
            onClick={addMember}
            className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary hover:bg-gray-50 transition group"
          >
            <div className="flex items-center justify-center text-gray-500 group-hover:text-primary">
              <Plus className="w-6 h-6 mr-2" />
              <span className="font-semibold">Tambah Anggota</span>
            </div>
          </button>
        )}

        {data.members.length >= MAX_MEMBERS && (
          <div className="text-center text-gray-500 text-sm py-4">
            Maksimal {MAX_MEMBERS} anggota tercapai
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      {priceCalculation && data.members.length >= MIN_MEMBERS && (
        <div className="mt-6">
          <PriceDisplay
            calculation={priceCalculation}
            category={data.category as "5K" | "10K"}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="btn-outline flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn-primary flex items-center gap-2"
        >
          Lanjutkan
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
