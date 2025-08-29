import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Informasi Komunitas" },
    { number: 2, label: "Data Anggota" },
    { number: 3, label: "Review & Pembayaran" }
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-2">
        {steps.slice(0, totalSteps).map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center 
                font-semibold transition-all
                ${step.number < currentStep
                  ? "bg-green-500 text-white"
                  : step.number === currentStep
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
                }
              `}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                step.number
              )}
            </div>

            {index < totalSteps - 1 && (
              <div
                className={`
                  w-12 h-1 
                  ${step.number < currentStep ? "bg-green-500" : "bg-gray-200"}
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}