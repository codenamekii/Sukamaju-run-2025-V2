"use client";

import {
  Category,
  PROVINCES
} from "@/lib/types/registration";
import {
  calculatePrice,
  clearFormSession,
  formatCurrency,
  formatPhoneNumber,
  getJerseySizeLabel,
  loadFormFromSession,
  saveFormToSession,
  validateAgeForCategory
} from "@/lib/utils/registration";
import {
  RegistrationData,
  registrationSchema
} from "@/lib/validation/registration";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Trophy,
  Users
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";



// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
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
            {step < totalSteps && (
              <div
                className={`w-12 h-1 ${step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}



export default function RegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  type PriceCalculation = {
    basePrice: number;
    jerseyAdjustment: number;
    earlyBirdDiscount: number;
    totalPrice: number;
  };

  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);

  const {
    register,
    watch,
    formState: { errors },
    setValue,
    trigger,
    getValues,
  } = useForm<RegistrationData>({
    mode: "onChange",
    resolver: zodResolver(registrationSchema),
    defaultValues: loadFormFromSession() || {},
  });

  // Watch form changes
  const watchedCategory = watch("category");
  const watchedJerseySize = watch("jerseySize");
  const watchedDateOfBirth = watch("dateOfBirth");

  // Auto-save form data
  useEffect(() => {
    const subscription = watch((data) => {
      saveFormToSession(data);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Update price calculation
  useEffect(() => {
    if (watchedCategory && watchedJerseySize) {
      const calculation = calculatePrice(watchedCategory, watchedJerseySize);
      setPriceCalculation(calculation);
    }
  }, [watchedCategory, watchedJerseySize]);

  // Handle category selection (Step 1)
  const handleCategorySelect = (category: Category) => {
    if (category === "COMMUNITY") {
      router.push("/registration/community");
      return;
    }

    setSelectedCategory(category);
    setValue("category", category);
    setCurrentStep(2);
  };

  // Handle step navigation
  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 2) {
      isValid = await trigger([
        "fullName", "gender", "dateOfBirth", "identityNumber", "nationality",
        "whatsapp", "email", "address", "city", "province",
        "bibName", "jerseySize"
      ]);
    } else if (currentStep === 3) {
      isValid = await trigger([
        "emergencyName", "emergencyRelation", "emergencyPhone", "bloodType"
      ]);
    } else if (currentStep === 4) {
      isValid = await trigger([
        "agreeToTerms", "agreeToHealth", "agreeToRefund", "agreeToData"
      ]);
    }

    if (isValid) {
      if (currentStep === 4) {
        handleFormSubmit(getValues());
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle form submission
  // Replace handleFormSubmit in app/registration/page.tsx with this:

  // Handle form submission
  const handleFormSubmit = async (data: RegistrationData) => {
    setIsSubmitting(true);

    try {
      // Format phone numbers
      data.whatsapp = formatPhoneNumber(data.whatsapp);
      data.emergencyPhone = formatPhoneNumber(data.emergencyPhone);

      // Prepare data for API
      const apiData = {
        fullName: data.fullName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        idNumber: data.identityNumber,
        email: data.email,
        whatsapp: data.whatsapp,
        address: data.address,
        province: data.province,
        city: data.city || "",
        category: selectedCategory,
        bibName: data.bibName,
        jerseySize: data.jerseySize,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        emergencyRelation: data.emergencyRelation,
        bloodType: data.bloodType || "",
        medicalHistory: data.medicalHistory || "",
        allergies: data.allergies || "",
      };

      // Call the actual API
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      const result = await response.json();
      console.log("API Response:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Registration failed");
      }

      // Registration successful
      const { registrationCode } = result.data;

      // Clear session storage
      clearFormSession();

      // ✅ Hanya redirect ke halaman pembayaran
      router.push(`/registration/payment?code=${registrationCode}&type=INDIVIDUAL`);

    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Registration failed";
      alert(`❌ REGISTRASI GAGAL\n\nError: ${errorMessage}\n\nSilakan coba lagi atau hubungi panitia.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    {
      id: "5K" as Category,
      title: "5K Umum",
      price: "Rp 180.000",
      originalPrice: null,
      description: "Cocok untuk pemula dan keluarga",
      features: ["Jersey eksklusif", "Medali finisher", "Race pack", "E-certificate"],
      icon: <Users className="w-8 h-8" />,
      color: "from-primary to-torea-bay",
      popular: true,
      link: "./page.tsx"
    },
    {
      id: "10K" as Category,
      title: "10K Professional",
      price:  "Rp 230.000",
      originalPrice: null,
      description: "Untuk pelari berpengalaman",
      features: ["Jersey premium", "Medali eksklusif", "Prize pool"],
      icon: <Trophy className="w-8 h-8" />,
      color: "from-secondary to-accent",
      popular: false,
      link: "./page.tsx"
    },
    {
      id: "COMMUNITY" as Category,
      title: "Komunitas",
      price: "Special Price",
      description: "Minimal 5 Orang",
      features: ["Diskon 15%", "Tent khusus", "Photo booth", "Group certificate"],
      icon: <Users className="w-8 h-8" />,
      color: "from-waikawa-gray to-ship-cove",
      link: "./community/page.tsx"
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center text-white hover:text-secondary transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={5} />

        {/* Step 1: Category Selection */}
        {currentStep === 1 && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Pilih Kategori Lomba
              </h2>
              <p className="text-gray-600">
                Pilih kategori yang sesuai dengan kemampuan Anda
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`relative bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${category.popular ? "ring-2 ring-secondary" : ""
                    }`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {category.popular && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-bold z-10">
                      POPULAR
                    </div>
                  )}

                  <div className={`h-2 bg-gradient-to-r ${category.color}`} />

                  <div className="p-6">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${category.color} text-white mb-4`}>
                      {category.icon}
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {category.title}
                    </h3>

                    <div className="mb-2">
                      <span className="text-2xl font-bold text-primary">
                        {category.price}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{category.description}</p>

                    <ul className="space-y-2 mb-4">
                      {category.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Personal & Contact Information */}
        {currentStep === 2 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Informasi Peserta
              </h2>

              <form className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Diri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        {...register("fullName")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Sesuai KTP/Identitas"
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jenis Kelamin *
                      </label>
                      <select
                        {...register("gender")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Pilih</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                      {errors.gender && (
                        <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tanggal Lahir *
                      </label>
                      <input
                        type="date"
                        {...register("dateOfBirth")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {errors.dateOfBirth && (
                        <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>
                      )}
                      {watchedDateOfBirth && watchedCategory && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const validation = validateAgeForCategory(watchedDateOfBirth, watchedCategory);
                            return validation.isValid
                              ? `Usia: ${validation.currentAge} tahun ✓`
                              : `Usia minimal ${validation.minAge} tahun untuk kategori ${watchedCategory}`;
                          })()}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No. KTP/Identitas *
                      </label>
                      <input
                        type="text"
                        {...register("identityNumber")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="16 digit"
                        maxLength={16}
                      />
                      {errors.identityNumber && (
                        <p className="text-red-500 text-xs mt-1">{errors.identityNumber.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kewarganegaraan *
                      </label>
                      <select
                        {...register("nationality")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Pilih</option>
                        <option value="WNI">WNI</option>
                        <option value="WNA">WNA</option>
                      </select>
                      {errors.nationality && (
                        <p className="text-red-500 text-xs mt-1">{errors.nationality.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Kontak</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        No. WhatsApp *
                      </label>
                      <input
                        type="tel"
                        {...register("whatsapp")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="08123456789"
                      />
                      {errors.whatsapp && (
                        <p className="text-red-500 text-xs mt-1">{errors.whatsapp.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        {...register("email")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="email@example.com"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alamat Lengkap *
                      </label>
                      <textarea
                        {...register("address")}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Alamat lengkap sesuai KTP"
                      />
                      {errors.address && (
                        <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kota *
                      </label>
                      <input
                        type="text"
                        {...register("city")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nama kota"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provinsi *
                      </label>
                      <select
                        {...register("province")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Pilih Provinsi</option>
                        {PROVINCES.map((province) => (
                          <option key={province} value={province}>
                            {province}
                          </option>
                        ))}
                      </select>
                      {errors.province && (
                        <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Race Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Lomba</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama di BIB *
                      </label>
                      <input
                        type="text"
                        {...register("bibName")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Max 10 karakter"
                        maxLength={10}
                      />
                      {errors.bibName && (
                        <p className="text-red-500 text-xs mt-1">{errors.bibName.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ukuran Jersey *
                      </label>
                      <select
                        {...register("jerseySize")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Pilih Ukuran</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => (
                          <option key={size} value={size}>
                            {getJerseySizeLabel(size as 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL')}
                          </option>
                        ))}
                      </select>
                      {errors.jerseySize && (
                        <p className="text-red-500 text-xs mt-1">{errors.jerseySize.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Komunitas Lari (Opsional)
                      </label>
                      <input
                        type="text"
                        {...register("runningCommunity")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nama komunitas"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowSizeChart(true)}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        Size Chart
                      </button>

                      {showSizeChart && (
                        <div
                          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                          onClick={() => setShowSizeChart(false)}
                        >
                          <div
                            className="bg-white p-4 rounded-lg max-w-sm w-full relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setShowSizeChart(false)}
                              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                            >
                              ✕
                            </button>

                            <Image
                              src="/images/sizechart.png"
                              alt="Size Chart"
                              width={600} // sesuaikan
                              height={400} // sesuaikan
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
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
          </div>
        )}

        {/* Step 3: Emergency Contact */}
        {currentStep === 3 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Kontak Darurat & Kesehatan
              </h2>

              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Kontak Darurat *
                    </label>
                    <input
                      type="text"
                      {...register("emergencyName")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nama lengkap"
                    />
                    {errors.emergencyName && (
                      <p className="text-red-500 text-xs mt-1">{errors.emergencyName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hubungan *
                    </label>
                    <select
                      {...register("emergencyRelation")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Pilih</option>
                      <option value="Keluarga">Keluarga</option>
                      <option value="Teman">Teman</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    {errors.emergencyRelation && (
                      <p className="text-red-500 text-xs mt-1">{errors.emergencyRelation.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. Telp Darurat *
                    </label>
                    <input
                      type="tel"
                      {...register("emergencyPhone")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="08123456789"
                    />
                    {errors.emergencyPhone && (
                      <p className="text-red-500 text-xs mt-1">{errors.emergencyPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Golongan Darah *
                    </label>
                    <select
                      {...register("bloodType")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Pilih</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.bloodType && (
                      <p className="text-red-500 text-xs mt-1">{errors.bloodType.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Riwayat Kesehatan (Opsional)
                    </label>
                    <textarea
                      {...register("medicalHistory")}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Kondisi medis yang perlu diketahui (jantung, asma, diabetes, dll)"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alergi (Opsional)
                    </label>
                    <input
                      type="text"
                      {...register("allergies")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Alergi makanan, obat, dll"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold mb-1">Informasi Penting:</p>
                      <p>Pastikan informasi kontak darurat dapat dihubungi pada hari perlombaan. Data kesehatan akan dijaga kerahasiaannya dan hanya digunakan untuk keperluan medis darurat.</p>
                    </div>
                  </div>
                </div>
              </form>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
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
          </div>
        )}

        {/* Step 4: Review & Terms */}
        {currentStep === 4 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-bold text-primary mb-6">
                Review & Syarat Ketentuan
              </h2>

              {/* Data Review */}
              <div className="space-y-4 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Data Peserta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Nama:</span>
                      <span className="ml-2 font-medium">{watch("fullName")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Kategori:</span>
                      <span className="ml-2 font-medium">{watch("category")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <span className="ml-2 font-medium">{watch("email")}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">WhatsApp:</span>
                      <span className="ml-2 font-medium">{watch("whatsapp")}</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                {priceCalculation && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Rincian Biaya</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Biaya Registrasi:</span>
                        <span className="font-medium">{formatCurrency(priceCalculation.basePrice)}</span>
                      </div>
                      {priceCalculation.jerseyAdjustment > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tambahan Jersey (Size XL+):</span>
                          <span className="font-medium">+ {formatCurrency(priceCalculation.jerseyAdjustment)}</span>
                        </div>
                      )}
                      {priceCalculation.earlyBirdDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Diskon Early Bird:</span>
                          <span className="font-medium">- {formatCurrency(priceCalculation.earlyBirdDiscount)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-lg font-bold">
                          <span>Total:</span>
                          <span className="text-primary">{formatCurrency(priceCalculation.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800">Syarat & Ketentuan</h3>

                <div className="space-y-3">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("agreeToData")}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya menyatakan bahwa semua data yang saya isi adalah benar dan dapat dipertanggungjawabkan
                    </span>
                  </label>
                  {errors.agreeToData && (
                    <p className="text-red-500 text-xs ml-7">{errors.agreeToData.message}</p>
                  )}

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("agreeToHealth")}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya menyatakan dalam kondisi sehat dan fit untuk mengikuti lomba lari SUKAMAJU RUN 2025
                    </span>
                  </label>
                  {errors.agreeToHealth && (
                    <p className="text-red-500 text-xs ml-7">{errors.agreeToHealth.message}</p>
                  )}

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("agreeToRefund")}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya memahami bahwa biaya pendaftaran yang telah dibayarkan tidak dapat dikembalikan dalam kondisi apapun
                    </span>
                  </label>
                  {errors.agreeToRefund && (
                    <p className="text-red-500 text-xs ml-7">{errors.agreeToRefund.message}</p>
                  )}

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("agreeToTerms")}
                      className="mt-1 mr-3 w-4 h-4 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-600">
                      Saya telah membaca dan menyetujui semua syarat dan ketentuan yang berlaku untuk SUKAMAJU RUN 2025
                    </span>
                  </label>
                  {errors.agreeToTerms && (
                    <p className="text-red-500 text-xs ml-7">{errors.agreeToTerms.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={handleBack}
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