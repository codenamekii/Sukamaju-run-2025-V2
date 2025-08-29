"use client";

import { CommunityMember, CommunityPriceCalculation, CommunityRegistrationData } from "@/lib/types/community-registration";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  calculateCommunityPrice,
  formatCurrency,
  submitCommunityRegistration
} from "../utils/community-helpers";
import PriceDisplay from "./price-display";

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
  setIsSubmitting
}: Step3ReviewProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [priceCalculation, setPriceCalculation] = useState<CommunityPriceCalculation | null>(null);

  useEffect(() => {
    if (!data?.members) return;

    const members = data.members as CommunityMember[];
    const participantCount = members.length;
    const plusSizeJerseyCount = members.filter(
      (m) => ["XL", "XXL", "XXXL"].includes(m.jerseySize)
    ).length;

    // Panggil calculateCommunityPrice dengan dua kemungkinan signature.
    // Cast ke any supaya TypeScript tidak protes di compile time.
    let rawCalc: unknown;
    try {
      // coba signature: (category, members)
      rawCalc = (calculateCommunityPrice as unknown as (cat: "5K" | "10K", mem: CommunityMember[]) => string)(
        data.category as "5K" | "10K",
        members
      );
    } catch {
      // fallback: (participantCount, plusSizeJerseyCount)
      rawCalc = (calculateCommunityPrice as unknown as (count: number, plus: number) => unknown)(
        participantCount,
        plusSizeJerseyCount
      );
    }

    

    // Map hasil mentah ke CommunityPriceCalculation
    const mapped: CommunityPriceCalculation = mapToCommunityCalculation(rawCalc, members);
    setPriceCalculation(mapped);
  }, [data.members, data.category]);

  function mapToCommunityCalculation(raw: any, members: CommunityMember[]): CommunityPriceCalculation {
    // Kalau sudah cocok, pakai langsung
    if (
      raw &&
      typeof raw.baseMembers === "number" &&
      typeof raw.totalMembers === "number" &&
      typeof raw.pricePerPerson === "number" &&
      typeof raw.totalPrice === "number"
    ) {
      return raw as CommunityPriceCalculation;
    }

    const totalMembers = members.length;
    const freeMembers = raw?.freeMembers ?? 0;
    const baseMembers = totalMembers - freeMembers;

    const subtotal = raw?.subtotal ?? raw?.basePrice ?? raw?.totalBase ?? 0;
    const totalJerseyAdjustment = raw?.totalJerseyAdjustment ?? raw?.jerseyAddOnTotal ?? raw?.jerseyAddOn ?? 0;
    const savings = raw?.savings ?? 0;

    // distribusi penyesuaian jersey ke tiap member (jika diketahui total penyesuaian)
    const plusSizeCount = members.filter((m) => ["XL", "XXL", "XXXL"].includes(m.jerseySize)).length;
    const perAdjustment = plusSizeCount ? Math.round(totalJerseyAdjustment / plusSizeCount) : 0;

    const jerseyAdjustments = members.map((m, i) => ({
      memberName: m.fullName || m.bibName || `Member ${i + 1}`,
      size: m.jerseySize,
      adjustment: ["XL", "XXL", "XXXL"].includes(m.jerseySize) ? perAdjustment : 0,
    }));

    const pricePerPerson = raw?.pricePerPerson ?? (baseMembers ? Math.round((subtotal + totalJerseyAdjustment - savings) / baseMembers) : 0);
    const totalPrice = raw?.totalPrice ?? subtotal + totalJerseyAdjustment - savings;

    return {
      baseMembers,
      freeMembers,
      totalMembers,
      pricePerPerson,
      subtotal,
      jerseyAdjustments,
      totalJerseyAdjustment,
      totalPrice,
      savings,
    };
  }


  const validateTerms = () => {
    const errors: string[] = [];

    if (!data.agreeToTerms) errors.push("Anda harus menyetujui syarat dan ketentuan");
    if (!data.agreeToHealth) errors.push("Anda harus menyatakan semua member dalam kondisi sehat");
    if (!data.agreeToRefund) errors.push("Anda harus menyetujui kebijakan pengembalian");
    if (!data.agreeToData) errors.push("Anda harus menyatakan data yang diisi benar");

    return errors;
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
      const { registrationResults, failedRegistrations } = await submitCommunityRegistration(data);

      if (registrationResults.length === 0) {
        throw new Error('Semua registrasi gagal. Silakan coba lagi.');
      }

      // Build success message
      let successMessage = `✅ REGISTRASI KOMUNITAS BERHASIL!\n\n`;
      successMessage += `Komunitas: ${data.communityName}\n`;
      successMessage += `Kategori: ${data.category}\n`;
      successMessage += `Berhasil: ${registrationResults.length} peserta\n`;

      if (failedRegistrations.length > 0) {
        successMessage += `Gagal: ${failedRegistrations.length} peserta\n\n`;
        successMessage += `Peserta yang gagal:\n`;
        failedRegistrations.forEach((f: any) => {
          successMessage += `- ${f.name}: ${f.error}\n`;
        });
      }

      if (priceCalculation) {
        successMessage += `\nTotal Biaya: ${formatCurrency(priceCalculation.totalPrice)}`;
      }
      successMessage += `\n\nSilakan screenshot informasi ini!`;

      alert(successMessage);

      // Redirect to success page
      if (registrationResults.length > 0) {
        const firstCode = registrationResults[0].registrationCode;
        router.push(`/registration/success?code=${firstCode}&type=community&count=${registrationResults.length}`);
      }

    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      alert(`❌ REGISTRASI KOMUNITAS GAGAL\n\nError: ${errorMessage}\n\nSilakan coba lagi atau hubungi panitia.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl font-bold text-primary mb-6">
          Review & Syarat Ketentuan
        </h2>

        {/* Community Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">Informasi Komunitas</h3>
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
              <span className="ml-2 font-medium">{data.members.length} orang</span>
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
            {data.members.map((member: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{index + 1}. {member.fullName}</span>
                <span className="text-gray-600">
                  {member.jerseySize}
                  {['XXL', 'XXXL'].includes(member.jerseySize) && ' (+20k)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        {priceCalculation && (data.category === "5K" || data.category === "10K") && (
          <div className="mb-6">
            <PriceDisplay calculation={priceCalculation} category={data.category} />
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Syarat & Ketentuan</h3>

          <div className="space-y-3">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToData}
                onChange={(e) => updateField('agreeToData', e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya menyatakan bahwa semua data anggota komunitas yang saya isi adalah benar dan dapat dipertanggungjawabkan
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToHealth}
                onChange={(e) => updateField('agreeToHealth', e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya menyatakan semua anggota komunitas dalam kondisi sehat dan fit untuk mengikuti lomba lari SUKAMAJU RUN 2025 kategori {data.category}
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToRefund}
                onChange={(e) => updateField('agreeToRefund', e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya memahami bahwa biaya pendaftaran yang telah dibayarkan tidak dapat dikembalikan dalam kondisi apapun
              </span>
            </label>

            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={data.agreeToTerms}
                onChange={(e) => updateField('agreeToTerms', e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya telah membaca dan menyetujui semua syarat dan ketentuan yang berlaku untuk SUKAMAJU RUN 2025 atas nama seluruh anggota komunitas
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
