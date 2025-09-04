// app/registration/community/components/step-3-review.tsx

"use client";

import {
  CommunityMember,
  CommunityRegistrationData,
  calculateCommunityPrice
} from "@/lib/types/community-registration";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { submitCommunityRegistration } from "../utils/community-helper";

interface Step3ReviewProps {
  data: CommunityRegistrationData;
  onChange: (data: CommunityRegistrationData) => void;
  onBack: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess?: () => void; // Callback after successful submission
}

export default function Step3Review({
  data,
  onChange,
  onBack,
  isSubmitting,
  setIsSubmitting,
  onSuccess
}: Step3ReviewProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const lastSubmitTime = useRef<number>(0);

  const priceCalculation = calculateCommunityPrice(
    data.category as "5K" | "10K",
    data.members
  );

  // Prevent double-click and rapid submissions
  const canSubmit = () => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime.current;
    return timeSinceLastSubmit > 2000; // Minimum 2 seconds between attempts
  };

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
    // Check if can submit (prevent rapid clicks)
    if (!canSubmit()) {
      console.log("Too fast, please wait");
      return;
    }

    // Validate terms first
    const validationErrors = validateTerms();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Update last submit time
    lastSubmitTime.current = Date.now();

    // Disable button immediately
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true;
    }

    setIsSubmitting(true);
    setErrors([]);
    setSubmitAttempts(prev => prev + 1);

    try {
      console.log("Starting community registration...");

      const {
        registrationResults,
        communityRegistrationCode,
        paymentCode,
        totalPrice
      } = await submitCommunityRegistration(data);

      if (!communityRegistrationCode) {
        throw new Error("Tidak ada kode registrasi komunitas");
      }

      console.log("Registration successful:", {
        code: communityRegistrationCode,
        members: registrationResults.length,
        payment: paymentCode
      });

      // Clear local storage draft after success
      if (onSuccess) {
        onSuccess();
      }

      // Show success message
      const successMessage = `✅ Registrasi Berhasil!\n\n` +
        `${registrationResults.length} peserta terdaftar.\n` +
        `Kode: ${communityRegistrationCode}\n` +
        `Total: Rp ${totalPrice.toLocaleString('id-ID')}\n\n` +
        `Lanjut ke pembayaran...`;

      alert(successMessage);

      // Navigate to payment page
      router.push(`/registration/payment?code=${communityRegistrationCode}&type=COMMUNITY`);

    } catch (error) {
      console.error("Registration error:", error);

      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";

      // Check if it's a duplicate submission error
      if (errorMessage.includes("already registered") || errorMessage.includes("sudah terdaftar")) {
        setErrors([errorMessage]);
      } else if (errorMessage.includes("Too many")) {
        setErrors(["Terlalu banyak percobaan. Silakan tunggu beberapa saat."]);
      } else {
        setErrors([`Registrasi gagal: ${errorMessage}`]);
      }

      // Re-enable button after error
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = false;
      }
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
          Review & Konfirmasi
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
            <div className="md:col-span-2">
              <span className="text-gray-600">Alamat:</span>
              <span className="ml-2 font-medium">
                {data.address}, {data.city}, {data.province}
              </span>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">
            Daftar Anggota ({data.members.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.members.map((member: CommunityMember, index: number) => (
              <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200">
                <span>
                  {index + 1}. {member.fullName || `Member ${index + 1}`}
                </span>
                <div className="flex gap-4">
                  <span className="text-gray-600">
                    {member.jerseySize}
                    {["XXL", "XXXL"].includes(member.jerseySize) && (
                      <span className="text-orange-600 ml-1">(+20k)</span>
                    )}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {member.email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        {priceCalculation && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Rincian Biaya</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Harga per orang ({data.category}):
                </span>
                <span className="font-medium">
                  {formatCurrency(priceCalculation.basePrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal ({priceCalculation.totalMembers} × {formatCurrency(priceCalculation.basePrice)}):
                </span>
                <span className="font-medium">
                  {formatCurrency(priceCalculation.totalBase)}
                </span>
              </div>

              {/* Jersey Addons */}
              {priceCalculation.jerseyAddOnTotal > 0 && (
                <div className="border-t pt-2 mt-2">
                  <div className="font-medium text-gray-700 mb-1">
                    Biaya Tambahan Jersey (XXL/XXXL):
                  </div>
                  {priceCalculation.jerseyAdjustments
                    .filter(j => j.adjustment > 0)
                    .map((jersey, idx) => (
                      <div key={idx} className="flex justify-between ml-4 text-gray-600">
                        <span>{jersey.memberName} ({jersey.size}):</span>
                        <span>+{formatCurrency(jersey.adjustment)}</span>
                      </div>
                    ))}
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Total Jersey Addon:</span>
                    <span className="font-medium">
                      +{formatCurrency(priceCalculation.jerseyAddOnTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-base">
                  <span>Total Pembayaran:</span>
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

        {/* Terms & Conditions */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-800">Syarat & Ketentuan</h3>

          <div className="space-y-3">
            <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
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

            <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
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

            <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
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

            <label className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={data.agreeToTerms || false}
                onChange={(e) => updateField("agreeToTerms", e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Saya telah membaca dan menyetujui semua syarat dan ketentuan
                yang berlaku untuk SUKAMAJU RUN 2025
              </span>
            </label>
          </div>
        </div>

        {/* All checkboxes status */}
        {data.agreeToData && data.agreeToHealth && data.agreeToRefund && data.agreeToTerms && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">
              Semua persyaratan telah disetujui
            </span>
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
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

        {/* Submit attempts indicator */}
        {submitAttempts > 1 && (
          <div className="text-xs text-gray-500 text-center mb-2">
            Percobaan submit: {submitAttempts}
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
            ref={submitButtonRef}
            type="button"
            onClick={handleSubmit}
            className={`btn-primary flex items-center gap-2 relative ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Memproses...</span>
                <span className="absolute -top-2 -right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </>
            ) : (
              <>
                Lanjut ke Pembayaran
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Additional warning during submission */}
        {isSubmitting && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              ⚠️ Mohon tunggu, jangan tutup halaman atau klik tombol lain...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}