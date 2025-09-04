"use client";

import { CommunityRegistrationData, emptyMember } from "@/lib/types/community-registration";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Step1Info from "./components/step-1-info";
import Step2Members from "./components/step-2-members";
import Step3Review from "./components/step-3-review";
import StepIndicator from "./components/step-indicator";

const STORAGE_KEY = "community-registration-draft";
const STORAGE_VERSION = "v1";

export default function CommunityRegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [communityData, setCommunityData] = useState<CommunityRegistrationData>({
    communityName: "",
    picName: "",
    picWhatsapp: "",
    picEmail: "",
    address: "",
    city: "",
    province: "",
    category: "5K",
    members: [{ ...emptyMember }],
    agreeToTerms: false,
    agreeToHealth: false,
    agreeToRefund: false,
    agreeToData: false
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === STORAGE_VERSION && parsed.data) {
          const shouldRestore = window.confirm(
            "Ada draft registrasi yang tersimpan. Mau lanjutkan dari draft?"
          );
          if (shouldRestore) {
            setCommunityData(parsed.data);
            setLastSaved(new Date(parsed.timestamp));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    try {
      const draft = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        data: communityData
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving draft:", error);
    }
  }, [communityData]);

  // Auto-save every 30 seconds if there are changes
  useEffect(() => {
    const timer = setInterval(() => {
      if (communityData.communityName || communityData.picEmail) {
        saveDraft();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [communityData, saveDraft]);

  // Save draft when data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (communityData.communityName || communityData.picEmail) {
        saveDraft();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [communityData, saveDraft]);

  // Clear draft after successful submission
  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveDraft(); // Save when moving to next step
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Prevent navigation if form has data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        !isSubmitting &&
        (communityData.communityName || communityData.members.length > 1)
      ) {
        e.preventDefault();
        e.returnValue = "Data registrasi belum tersimpan. Yakin mau keluar?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [communityData, isSubmitting]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-4 sticky top-0 z-40 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <Link
              href="/registration"
              className="flex items-center text-white hover:text-secondary transition"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Kembali
            </Link>
            <h1 className="text-xl font-bold">Registrasi Komunitas</h1>
            <div className="text-sm">
              <span className="bg-secondary text-tangaroa px-3 py-1 rounded-full font-semibold">
                Min. 5 orang
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="bg-green-50 border-b border-green-200 py-2 px-4 text-center">
          <p className="text-sm text-green-700">
            Draft tersimpan otomatis • {lastSaved.toLocaleTimeString('id-ID')}
          </p>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} totalSteps={3} />

        {/* Step Components */}
        {currentStep === 1 && (
          <Step1Info
            data={communityData}
            onChange={setCommunityData}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Step2Members
            data={communityData}
            onChange={setCommunityData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <Step3Review
            data={communityData}
            onChange={setCommunityData}
            onBack={handleBack}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={clearDraft} // Clear draft after successful submission
          />
        )}
      </div>
    </div>
  );
}