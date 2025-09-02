// app/admin/dashboard/types.ts
export interface RacePack {
  qrCode: string;
  isCollected: boolean;
  collectedAt?: string;
  collectorName?: string;
}

export interface Payment {
  id: string;
  amount: number;
  paymentMethod?: string;
  paymentChannel?: string;
  createdAt: string;
  status: "PAID" | "PENDING" | "FAILED";
}

export interface Participant {
  id: string;
  registrationCode: string;
  registrationStatus: "CONFIRMED" | "PENDING" | "CANCELLED";
  fullName: string;
  gender: "L" | "P";
  dateOfBirth: string;
  idNumber?: string;
  bloodType?: string;
  jerseySize?: string;
  email: string;
  whatsapp: string;
  address?: string;
  province?: string;
  city?: string;
  bibNumber?: string;
  bibName?: string;
  estimatedTime?: string;
  category?: string;

  basePrice: number;
  jerseyAddOn?: number;
  totalPrice: number;
  payments: Payment[];

  racePack?: RacePack;

  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
}

export type Activity = {
  id: string;
  type: "registration" | "payment" | "checkin" | string;
  description: string;
  timestamp: string;
  status: "success" | "pending" | "failed" | string;
};

export type DashboardStats = {
  totalParticipants: number;
  confirmedParticipants: number;
  pendingPayments: number;
  totalRevenue: number;
  todayRegistrations: number;
  weeklyGrowth: number;
  categoryBreakdown: {
    [key: string]: number;
  };
  recentActivities: Activity[];
  registrationTrend: {
    date: string;
    registrations: number;
    payments: number;
  }[];
  paymentStats: {
    total: number;
    paid: number;
    pending: number;
    failed: number;
  };
};