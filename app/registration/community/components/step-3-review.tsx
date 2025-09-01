// app/registration/community/components/step-3-review.tsx

"use client";

import {
  CommunityMember,
  CommunityRegistrationData
} from "@/lib/types/community-registration";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  calculateCommunityPrice,
  submitCommunityRegistration
} from "../utils/community-helper"; // Fix: correct import path

// Define the price calculation type locally if not in types file
interface CommunityPriceCalculation {
  basePrice: number;
  baseMembers: number;
  freeMembers: number;
  totalMembers: number;
  subtotal: number;
  jerseyAdjustments: Array<{
    memberName: string;
    size: string;
    adjustment: number;
  }>;
  totalJerseyAdjustment: number;
  jerseyAddOnTotal: number;
  totalBase: number;
  totalPrice: number;
  pricePerPerson: number;
  savings: number;
}

interface Step3ReviewProps {
  data: CommunityRegistrationData;
  onChange: (data: CommunityRegistrationData) => void;
  onBack: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export default function Step3Review({
  data,
  onChange,
  onBack,
  isSubmitting,
  setIsSubmitting,
}: Step3ReviewProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [priceCalculation, setPriceCalculation] =
    useState<CommunityPriceCalculation | null>(null);

  useEffect(() => {
    if (!data?.members || data.members.length === 0) {
      console.log("No members data available");
      return;
    }

    if (data.category !== "5K" && data.category !== "10K") {
      console.log("Invalid category:", data.category);
      return;
    }

    try {
      const members = data.members as CommunityMember[];
      const calculation = calculateCommunityPrice(
        data.category as "5K" | "10K",
        members
      );

      console.log("Price calculation result:", calculation);
      setPriceCalculation(calculation);
    } catch (error) {
      console.error("Error calculating price:", error);
    }
  }, [data.members, data.category]);

  const validateTerms = () => {
    const errs: string[] = [];

    if (!data.agreeToTerms)
      errs.push("Anda harus menyetujui syarat dan ketentuan");
    if (!data.agreeToHealth)
      errs.push("Anda harus menyatakan semua member dalam kondisi sehat");
    if (!data.agreeToRefund)
      errs.push("Anda harus menyetujui kebijakan pengembalian");
    if (!data.agreeToData)
      errs.push("Anda harus menyatakan data yang diisi benar");

    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validateTerms();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const {
        registrationResults,
        communityRegistrationCode,
      } = await submitCommunityRegistration(data);

      if (!communityRegistrationCode) {
        throw new Error("Community registration gagal. Tidak ada kode registrasi komunitas.");
      }

      // FIX: Use community registration code, NOT individual member code
      const communityCode = communityRegistrationCode; // This will be COM-BFS4RX
      const type = "COMMUNITY";

      alert(
        `✅ ${registrationResults.length} peserta terdaftar. Lanjut ke pembayaran...`
      );

      router.push(`/registration/payment?code=${communityCode}&type=${type}`);
    } catch (error) {
      console.error("Registration error:", error);
      const msg =
        error instanceof Error ? error.message : "Registration failed";
      alert(
        `❌ REGISTRASI KOMUNITAS GAGAL\n\nError: ${msg}\n\nSilakan coba lagi atau hubungi panitia.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-primary mb-6">
          Review & Syarat Ketentuan
        </h2>

        {/* Community Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">
            Informasi Komunitas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Nama Komunitas:</span>
              <span className="ml-2 font-medium">{data.communityName}</span>
            </div>
            <div>
              <span className="text-gray-600">Kategori:</span>
              <span className="ml-2 font-medium">{data.category}</span>
            </div>
            <div>
              <span className="text-gray-600">PIC:</span>
              <span className="ml-2 font-medium">{data.picName}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Anggota:</span>
              <span className="ml-2 font-medium">
                {data.members.length} orang
              </span>
            </div>
            <div>
              <span className="text-gray-600">WhatsApp PIC:</span>
              <span className="ml-2 font-medium">{data.picWhatsapp}</span>
            </div>
            <div>
              <span className="text-gray-600">Email PIC:</span>
              <span className="ml-2 font-medium">{data.picEmail}</span>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Daftar Anggota</h3>
          <div className="space-y-2">
            {data.members.map((member: CommunityMember, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>
                  {index + 1}. {member.fullName || `Member ${index + 1}`}
                </span>
                <span className="text-gray-600">
                  {member.jerseySize}
                  {["XXL", "XXXL"].includes(member.jerseySize) && " (+20k)"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary - Fixed to show properly */}
        {priceCalculation && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Rincian Biaya</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Kategori {data.category}:
                </span>
                <span className="font-medium">
                  {formatCurrency(priceCalculation.basePrice)}/orang
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {priceCalculation.totalMembers} peserta × {formatCurrency(priceCalculation.basePrice)}:
                </span>
                <span className="font-medium">
                  {formatCurrency(priceCalculation.totalBase)}
                </span>
              </div>

              {/* Jersey Addon Details */}
              {priceCalculation.jerseyAddOnTotal > 0 && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <div className="font-medium text-gray-700 mb-1">Jersey Addon (XXL/XXXL):</div>
                    {priceCalculation.jerseyAdjustments
                      .filter(j => j.adjustment > 0)
                      .map((jersey, idx) => (
                        <div key={idx} className="flex justify-between ml-4">
                          <span className="text-gray-600">
                            {jersey.memberName} ({jersey.size}):
                          </span>
                          <span>+{formatCurrency(jersey.adjustment)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Total */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Total:</span>
                  <span className="text-primary text-lg">
                    {formatCurrency(priceCalculation.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Rata-rata per orang:</span>
                  <span>{formatCurrency(priceCalculation.pricePerPerson)}</span>
                </div>
                {priceCalculation.savings > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mt-1">
                    <span>Hemat (vs individual):</span>
                    <span>{formatCurrency(priceCalculation.savings)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* If price calculation failed, show fallback */}
        {!priceCalculation && data.members.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold">Kalkulasi Harga Manual:</p>
                <p>Kategori {data.category}: {data.category === '5K' ? 'Rp 171.000' : 'Rp 218.000'}/orang</p>
                <p>Total {data.members.length} orang</p>
                <p className="font-bold mt-1">
                  Total: {formatCurrency(
                    data.members.length * (data.category === '5K' ? 171000 : 218000) +
                    data.members.filter((m: CommunityMember) => ['XXL', 'XXXL'].includes(m.jerseySize)).length * 20000
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Syarat & Ketentuan</h3>

          <div className="space-y-3">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToData || false}
                onChange={(e) => updateField("agreeToData", e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya menyatakan bahwa semua data anggota komunitas yang saya isi
                adalah benar dan dapat dipertanggungjawabkan
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToHealth || false}
                onChange={(e) => updateField("agreeToHealth", e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya menyatakan semua anggota komunitas dalam kondisi sehat dan
                fit untuk mengikuti lomba lari SUKAMAJU RUN 2025 kategori{" "}
                {data.category}
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToRefund || false}
                onChange={(e) => updateField("agreeToRefund", e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya memahami bahwa biaya pendaftaran yang telah dibayarkan
                tidak dapat dikembalikan dalam kondisi apapun
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToTerms || false}
                onChange={(e) => updateField("agreeToTerms", e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya telah membaca dan menyetujui semua syarat dan ketentuan
                yang berlaku untuk SUKAMAJU RUN 2025 atas nama seluruh anggota
                komunitas
              </span>
            </label>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
              <div className="text-sm text-red-800">
                <ul className="list-disc list-inside">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={onBack}
            className="btn-outline flex items-center gap-2"
            disabled={isSubmitting}
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Lanjut ke Pembayaran
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}