// app/types/payment.ts
export const PAYMENT_STATUS = {
  SUCCESS: 'SUCCESS',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

// Map untuk display text
export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, string> = {
  SUCCESS: 'Paid',
  PENDING: 'Pending',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded'
};

// Map untuk badge styling
export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, {
  icon: string;
  className: string;
}> = {
  SUCCESS: {
    icon: 'CheckCircle',
    className: 'bg-green-100 text-green-800'
  },
  PENDING: {
    icon: 'Clock',
    className: 'bg-yellow-100 text-yellow-800'
  },
  FAILED: {
    icon: 'XCircle',
    className: 'bg-red-100 text-red-800'
  },
  EXPIRED: {
    icon: 'Clock',
    className: 'bg-gray-100 text-gray-800'
  },
  CANCELLED: {
    icon: 'XCircle',
    className: 'bg-gray-100 text-gray-800'
  },
  REFUNDED: {
    icon: 'RotateCcw',
    className: 'bg-purple-100 text-purple-800'
  }
};

export interface Payment {
  id: string;
  paymentCode: string;
  amount: number;
  paymentMethod: string | null;
  paymentChannel: string | null;
  midtransOrderId: string | null;
  vaNumber: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  participantId?: string | null;
  communityRegistrationId?: string | null;
  participant?: {
    id: string;
    fullName: string;
    email: string;
    whatsapp: string;
    category: string;
    registrationCode: string;
  };
  communityRegistration?: {
    id: string;
    communityName: string;
    picName: string;
    picEmail: string;
    picWhatsapp?: string;
    totalMembers: number;
    category: string;
  };
}

export interface PaymentUpdateRequest {
  paymentId: string;
  status: PaymentStatus;
  notes?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}