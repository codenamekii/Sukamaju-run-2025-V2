"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Gift,
  Loader2,
  Plus,
  Trash2,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  COMMUNITY_CONSTANTS,
  CommunityMember,
  CommunityPriceCalculation,
  CommunityRegistrationData
} from "@/lib/types/community-registration";
import { JerseySize, PROVINCES } from "@/lib/types/registration";
import {
  calculateCommunityPrice,
  formatPriceBreakdown,
  getExampleScenarios,
  getPromoInfo,
  validateCommunitySize,
  validateMembersAge
} from "@/lib/utils/community-registration";
import { formatCurrency } from "@/lib/utils/registration";

// Empty member template
const emptyMember: CommunityMember = {
  fullName: "",
  gender: "L",
  dateOfBirth: "",
  identityNumber: "",
  nationality: "WNI",
  whatsapp: "",
  email: "",
  bibName: "",
  jerseySize: "M",
  emergencyName: "",
  emergencyRelation: "Keluarga",
  emergencyPhone: "",
  bloodType: "O+",
  medicalHistory: "",
  allergies: ""
};

export default function CommunityRegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedMember, setExpandedMember] = useState<number | null>(0);

  // Form data
  const [communityData, setCommunityData] = useState<CommunityRegistrationData>({
    communityName: "",
    picName: "",
    picWhatsapp: "",
    picEmail: "",
    address: "",
    city: "",
    province: "",
    members: [{ ...emptyMember }],
    agreeToTerms: false,
    agreeToHealth: false,
    agreeToRefund: false,
    agreeToData: false
  });

  const [priceCalculation, setPriceCalculation] = useState<CommunityPriceCalculation | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate price whenever members change
  useEffect(() => {
    if (communityData.members.length >= COMMUNITY_CONSTANTS.MIN_MEMBERS) {
      const calculation = calculateCommunityPrice(communityData.members);
      setPriceCalculation(calculation);
    } else {
      setPriceCalculation(null);
    }
  }, [communityData.members]);

  // Add new member
  const addMember = () => {
    if (communityData.members.length < COMMUNITY_CONSTANTS.MAX_MEMBERS) {
      setCommunityData({
        ...communityData,
        members: [...communityData.members, { ...emptyMember }]
      });
      setExpandedMember(communityData.members.length);
    }
  };

  // Remove member
  const removeMember = (index: number) => {
    if (communityData.members.length > 1) {
      const newMembers = communityData.members.filter((_, i) => i !== index);
      setCommunityData({
        ...communityData,
        members: newMembers
      });
    }
  };

  // Update member data
  const updateMember = (index: number, field: keyof CommunityMember, value: unknown) => {
    const newMembers = [...communityData.members];
    newMembers[index] = {
      ...newMembers[index],
      [field]: value
    };
    setCommunityData({
      ...communityData,
      members: newMembers
    });
  };

  // Copy member data (for quick duplication)
  const copyMember = (index: number) => {
    const memberToCopy = { ...communityData.members[index] };
    // Clear unique fields
    memberToCopy.fullName = "";
    memberToCopy.identityNumber = "";
    memberToCopy.email = "";
    memberToCopy.whatsapp = "";
    memberToCopy.bibName = "";

    setCommunityData({
      ...communityData,
      members: [...communityData.members, memberToCopy]
    });
    setExpandedMember(communityData.members.length);
  };

  // Validate step
  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    if (step === 1) {
      // Validate community info
      if (!communityData.communityName) errors.push("Nama komunitas harus diisi");
      if (!communityData.picName) errors.push("Nama PIC harus diisi");
      if (!communityData.picWhatsapp) errors.push("WhatsApp PIC harus diisi");
      if (!communityData.picEmail) errors.push("Email PIC harus diisi");
      if (!communityData.address) errors.push("Alamat harus diisi");
      if (!communityData.city) errors.push("Kota harus diisi");
      if (!communityData.province) errors.push("Provinsi harus diisi");
    } else if (step === 2) {
      // Validate members
      const sizeValidation = validateCommunitySize(communityData.members.length);
      if (!sizeValidation.isValid) {
        errors.push(sizeValidation.message);
      }

      // Validate each member
      communityData.members.forEach((member, index) => {
        if (!member.fullName) errors.push(`Member ${index + 1}: Nama harus diisi`);
        if (!member.dateOfBirth) errors.push(`Member ${index + 1}: Tanggal lahir harus diisi`);
        if (!member.identityNumber) errors.push(`Member ${index + 1}: NIK harus diisi`);
        if (!member.email) errors.push(`Member ${index + 1}: Email harus diisi`);
        if (!member.whatsapp) errors.push(`Member ${index + 1}: WhatsApp harus diisi`);
        if (!member.bibName) errors.push(`Member ${index + 1}: Nama BIB harus diisi`);
      });

      // Validate age
      const ageValidation = validateMembersAge(communityData.members);
      if (!ageValidation.isValid) {
        errors.push(`Usia minimal 12 tahun. Member tidak memenuhi: ${ageValidation.invalidMembers.join(", ")}`);
      }
    } else if (step === 3) {
      // Validate terms
      if (!communityData.agreeToTerms) errors.push("Anda harus menyetujui syarat dan ketentuan");
      if (!communityData.agreeToHealth) errors.push("Anda harus menyatakan semua member dalam kondisi sehat");
      if (!communityData.agreeToRefund) errors.push("Anda harus menyetujui kebijakan pengembalian");
      if (!communityData.agreeToData) errors.push("Anda harus menyatakan data yang diisi benar");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
        setValidationErrors([]);
      }
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // TODO: Send to API
      console.log("Submitting community registration:", communityData);
      console.log("Price calculation:", priceCalculation);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert("Registration successful! (Mock - API not connected yet)");

    } catch (error) {
      console.error("Registration error:", error);
      alert("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const scenarios = getExampleScenarios();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/registration" className="flex items-center text-white hover:text-secondary transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </Link>
            <h1 className="text-xl font-bold">Registrasi Komunitas</h1>
            <div className="text-sm">
              <span className="bg-secondary text-tangaroa px-3 py-1 rounded-full font-semibold">
                Min. {COMMUNITY_CONSTANTS.MIN_MEMBERS} orang
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step < currentStep
                      ? "bg-green-500 text-white"
                      : step === currentStep
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                >
                  {step < currentStep ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-1 ${step < currentStep ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Community Information */}
        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto">
            {/* Info Box */}
            <div className="bg-gradient-to-r from-primary to-torea-bay text-white rounded-xl p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">
                <Users className="inline-block mr-2" />
                Registrasi Komunitas SUKAMAJU RUN 2025
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Harga Spesial</h3>
                  <p className="text-2xl font-bold">Rp 151.000</p>
                  <p className="text-sm opacity-90">per orang</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Promo Komunitas</h3>
                  <p className="text-2xl font-bold">10 + 1</p>
                  <p className="text-sm opacity-90">Daftar 10, gratis 1!</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Minimal Peserta</h3>
                  <p className="text-2xl font-bold">5 Orang</p>
                  <p className="text-sm opacity-90">Kategori 5K</p>
                </div>
              </div>
            </div>

            {/* Example Scenarios */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <Calculator className="inline-block mr-2 text-primary" />
                Contoh Perhitungan Biaya
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map((scenario, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">{scenario.description}</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Peserta: {scenario.members} orang</p>
                      {scenario.freeSlots > 0 && (
                        <p className="text-green-600">Gratis: {scenario.freeSlots} orang</p>
                      )}
                      <p className="text-lg font-bold text-primary">{scenario.total}</p>
                      {scenario.savings && (
                        <p className="text-green-600 text-xs">Hemat {scenario.savings}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Community Form */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Informasi Komunitas
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Komunitas *
                    </label>
                    <input
                      type="text"
                      value={communityData.communityName}
                      onChange={(e) => setCommunityData({ ...communityData, communityName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Contoh: Jakarta Runner Community"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama PIC (Penanggung Jawab) *
                    </label>
                    <input
                      type="text"
                      value={communityData.picName}
                      onChange={(e) => setCommunityData({ ...communityData, picName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nama lengkap PIC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp PIC *
                    </label>
                    <input
                      type="tel"
                      value={communityData.picWhatsapp}
                      onChange={(e) => setCommunityData({ ...communityData, picWhatsapp: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="08123456789"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email PIC *
                    </label>
                    <input
                      type="email"
                      value={communityData.picEmail}
                      onChange={(e) => setCommunityData({ ...communityData, picEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="pic@example.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Komunitas/Sekretariat *
                    </label>
                    <textarea
                      value={communityData.address}
                      onChange={(e) => setCommunityData({ ...communityData, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Alamat lengkap untuk pengiriman race pack"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kota *
                    </label>
                    <input
                      type="text"
                      value={communityData.city}
                      onChange={(e) => setCommunityData({ ...communityData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nama kota"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provinsi *
                    </label>
                    <select
                      value={communityData.province}
                      onChange={(e) => setCommunityData({ ...communityData, province: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Pilih Provinsi</option>
                      {PROVINCES.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Mohon lengkapi data berikut:</p>
                      <ul className="list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <Link href="/registration" className="btn-outline">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Kembali
                </Link>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                >
                  Lanjutkan
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Members Information */}
        {currentStep === 2 && (
          <div className="max-w-6xl mx-auto">
            {/* Member Count & Price Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-2">
                    Data Anggota Komunitas
                  </h2>
                  <p className="text-gray-600">
                    Total: {communityData.members.length} orang
                    {priceCalculation && priceCalculation.freeMembers > 0 && (
                      <span className="ml-2 text-green-600 font-semibold">
                        ({priceCalculation.freeMembers} gratis!)
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  {priceCalculation && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Biaya:</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(priceCalculation.totalPrice)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Info */}
              {communityData.members.length >= COMMUNITY_CONSTANTS.MIN_MEMBERS && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Gift className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-800 font-medium">
                      {getPromoInfo(communityData.members.length)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-4">
              {communityData.members.map((member, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  {/* Member Header */}
                  <div
                    className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => setExpandedMember(expandedMember === index ? null : index)}
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
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMember(index);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyMember(index);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Duplikat data member"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {expandedMember === index ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member Form (Expandable) */}
                  {expandedMember === index && (
                    <div className="p-6 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap *
                          </label>
                          <input
                            type="text"
                            value={member.fullName}
                            onChange={(e) => updateMember(index, 'fullName', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Sesuai KTP"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Jenis Kelamin *
                          </label>
                          <select
                            value={member.gender}
                            onChange={(e) => updateMember(index, 'gender', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'dateOfBirth', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'identityNumber', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="16 digit"
                            maxLength={16}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            WhatsApp *
                          </label>
                          <input
                            type="tel"
                            value={member.whatsapp}
                            onChange={(e) => updateMember(index, 'whatsapp', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'email', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'bibName', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'jerseySize', e.target.value as JerseySize)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="XS">XS</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL (+Rp 20.000)</option>
                            <option value="XXL">XXL (+Rp 20.000)</option>
                            <option value="XXXL">XXXL (+Rp 20.000)</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-gray-800 mb-2">Kontak Darurat</h4>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Kontak Darurat *
                          </label>
                          <input
                            type="text"
                            value={member.emergencyName}
                            onChange={(e) => updateMember(index, 'emergencyName', e.target.value)}
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
                            onChange={(e) => updateMember(index, 'emergencyPhone', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="08123456789"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Golongan Darah *
                          </label>
                          <select
                            value={member.bloodType}
                            onChange={(e) => updateMember(index, 'bloodType', e.target.value)}
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
              ))}

              {/* Add Member Button */}
              {communityData.members.length < COMMUNITY_CONSTANTS.MAX_MEMBERS && (
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
            </div>

            {/* Price Breakdown */}
            {priceCalculation && communityData.members.length >= COMMUNITY_CONSTANTS.MIN_MEMBERS && (
              <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Rincian Biaya
                </h3>
                <div className="space-y-2 text-sm">
                  {formatPriceBreakdown(priceCalculation).map((line, index) => (
                    <p key={index} className={line.startsWith('💰') ? 'text-green-600 font-semibold' : ''}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                  <div className="text-sm text-red-800">
                    <p className="font-semibold mb-1">Mohon lengkapi data berikut:</p>
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="btn-outline"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Kembali
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Lanjutkan
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Terms */}
        {currentStep === 3 && (
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
                    <span className="ml-2 font-medium">{communityData.communityName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">PIC:</span>
                    <span className="ml-2 font-medium">{communityData.picName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Anggota:</span>
                    <span className="ml-2 font-medium">{communityData.members.length} orang</span>
                  </div>
                  <div>
                    <span className="text-gray-600">WhatsApp PIC:</span>
                    <span className="ml-2 font-medium">{communityData.picWhatsapp}</span>
                  </div>
                </div>
              </div>

              {/* Price Summary */}
              {priceCalculation && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3">Rincian Biaya Final</h3>
                  <div className="space-y-1 text-sm">
                    {formatPriceBreakdown(priceCalculation).map((line, index) => (
                      <p key={index} className={line.startsWith('💰') ? 'text-green-600 font-semibold mt-2' : ''}>
                        {line}
                      </p>
                    ))}
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
                      checked={communityData.agreeToData}
                      onChange={(e) => setCommunityData({ ...communityData, agreeToData: e.target.checked })}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya menyatakan bahwa semua data anggota komunitas yang saya isi adalah benar dan dapat dipertanggungjawabkan
                    </span>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={communityData.agreeToHealth}
                      onChange={(e) => setCommunityData({ ...communityData, agreeToHealth: e.target.checked })}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya menyatakan semua anggota komunitas dalam kondisi sehat dan fit untuk mengikuti lomba lari SUKAMAJU RUN 2025 kategori 5K
                    </span>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={communityData.agreeToRefund}
                      onChange={(e) => setCommunityData({ ...communityData, agreeToRefund: e.target.checked })}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya memahami bahwa biaya pendaftaran yang telah dibayarkan tidak dapat dikembalikan dalam kondisi apapun
                    </span>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={communityData.agreeToTerms}
                      onChange={(e) => setCommunityData({ ...communityData, agreeToTerms: e.target.checked })}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya telah membaca dan menyetujui semua syarat dan ketentuan yang berlaku untuk SUKAMAJU RUN 2025 atas nama seluruh anggota komunitas
                    </span>
                  </label>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                    <div className="text-sm text-red-800">
                      <ul className="list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn-outline"
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Lanjut ke Pembayaran
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}