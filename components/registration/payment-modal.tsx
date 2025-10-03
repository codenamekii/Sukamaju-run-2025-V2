"use client";

import { RegistrationService } from "@/lib/services/registration.service";
import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    snap: Snap;
  }
}

export interface Snap {
  pay: (
    token: string,
    options: {
      onSuccess?: (result: unknown) => void;
      onPending?: (result: unknown) => void;
      onError?: (result: unknown) => void;
      onClose?: () => void;
    }
  ) => void;
}

interface PaymentModalProps {
  registrationCode: string;
  onSuccess: () => void;
  onPending: () => void;
  onError: (error: unknown) => void;
}

export function PaymentModal({
  registrationCode,
  onSuccess,
  onPending,
  onError,
}: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // gunakan useCallback agar stabil dan bisa dipanggil dari useEffect
  const initializePayment = useCallback(async () => {
    const checkPaymentStatus = async (orderId: string) => {
      const result = await RegistrationService.checkPaymentStatus(orderId);
      if (result?.data?.status === "SUCCESS") {
        onSuccess();
      } else if (result?.data?.status === "PENDING") {
        onPending();
      }
    };

    try {
      const { token, orderId } =
        await RegistrationService.createPaymentTransaction(registrationCode);

      setIsLoading(false);

      window.snap.pay(token, {
        onSuccess: async function (result: unknown) {
          console.log("Payment success:", result);
          onSuccess();
        },
        onPending: function (result: unknown) {
          console.log("Payment pending:", result);
          onPending();
        },
        onError: function (result: unknown) {
          console.log("Payment error:", result);
          onError(result);
        },
        onClose: function () {
          console.log("Payment popup closed");
          checkPaymentStatus(orderId);
        },
      });
    } catch (error) {
      setIsLoading(false);
      onError(error);
    }
  }, [registrationCode, onSuccess, onPending, onError]);

  useEffect(() => {
    const midtransScriptUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";

    const script = document.createElement("script");
    script.src = midtransScriptUrl;
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
    );
    script.onload = () => initializePayment();
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [initializePayment]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-center">Mempersiapkan pembayaran...</p>
        </div>
      </div>
    );
  }

  return null;
}