"use client";

import { CommunityRegistrationData } from "@/lib/types/community-registration";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Step1Info from "./components/step-1-info";
import Step2Members from "./components/step-2-members";
import Step3Review from "./components/step-3-review";
import StepIndicator from "./components/step-indicator";
import { emptyMember } from "./utils/community-helper";

export default function CommunityRegistrationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          />
        )}
      </div>
    </div>
  );
}