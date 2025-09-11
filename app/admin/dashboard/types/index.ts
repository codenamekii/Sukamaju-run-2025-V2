// app/admin/dashboard/types/index.ts

// Base types matching Prisma schema
export interface Participant {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  idNumber: string;
  bloodType: string | null;
  email: string;
  whatsapp: string;
  address: string;
  province: string;
  city: string;
  postalCode: string | null;
  category: string;
  bibName: string;
  jerseySize: string;
  estimatedTime: string | null;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalHistory: string | null;
  allergies: string | null;
  medications: string | null;
  registrationCode: string;
  bibNumber: string | null;
  registrationType: 'INDIVIDUAL' | 'COMMUNITY';
  basePrice: number;
  jerseyAddOn: number;
  totalPrice: number;
  isEarlyBird: boolean;
  registrationStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
  racePack?: RacePack | null;
  communityMember?: CommunityMember | null;
}

export interface Payment {
  id: string;
  paymentCode: string;
  amount: number;
  paymentMethod: string | null;
  paymentChannel: string | null;
  midtransOrderId: string | null;
  midtransToken: string | null;
  midtransResponse: Record<string, unknown> | null;
  vaNumber: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  paidAt: string | null;
  expiredAt: string | null;
  participantId: string | null;
  communityRegistrationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  participant?: Participant | null;
  communityRegistration?: CommunityRegistration | null;
}

export interface CommunityRegistration {
  id: string;
  communityName: string;
  communityType: string;
  communityAddress: string;
  picName: string;
  picWhatsapp: string;
  picEmail: string;
  picPosition: string | null;
  registrationCode: string;
  totalMembers: number;
  category: string;
  basePrice: number;
  totalBasePrice: number;
  promoAmount: number;
  jerseyAddOn: number;
  finalPrice: number;
  appliedPromo: string | null;
  registrationStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  members?: CommunityMember[];
  payments?: Payment[];
}

export interface CommunityMember {
  id: string;
  communityRegistrationId: string;
  participantId: string;
  memberNumber: number;
  isFreeMember: boolean;
  communityRegistration?: CommunityRegistration;
  participant?: Participant;
}

export interface RacePack {
  id: string;
  participantId: string;
  qrCode: string;
  isCollected: boolean;
  collectedAt: string | null;
  collectedBy: string | null;
  collectorName: string | null;
  collectorPhone: string | null;
  hasJersey: boolean;
  hasBib: boolean;
  hasMedal: boolean;
  hasGoodieBag: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  participant?: Participant;
}

export interface Notification {
  id: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  participantId: string | null;
  type: 'EMAIL' | 'WHATSAPP' | 'SMS';
  category: 'REGISTRATION' | 'PAYMENT' | 'REMINDER' | 'INFO' | 'CUSTOM' | 'BULK';
  subject: string | null;
  message: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'PARTIAL';
  sentAt: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// Dashboard specific types
export interface DashboardStats {
  totalParticipants: number;
  confirmedParticipants: number;
  pendingPayments: number;
  totalRevenue: number;
  todayRegistrations: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  categoryBreakdown: {
    '5K': number;
    '10K': number;
    'COMMUNITY': number;
  };
  paymentStats: {
    total: number;
    success: number;
    pending: number;
    failed: number;
    expired: number;
  };
  registrationTrend: Array<{
    date: string;
    registrations: number;
    payments: number;
  }>;
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: 'registration' | 'payment' | 'checkin' | 'refund';
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  participantId?: string;
  paymentId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentStats {
  total: number;
  success: number;
  pending: number;
  failed: number;
  expired: number;
  refunded: number;
  totalRevenue: number;
  todayRevenue: number;
  pendingAmount: number;
  averageAmount: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'VIEWER';
  isActive: boolean;
  lastLogin: string | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StatsResponse {
  totalParticipants: number;
  confirmedParticipants: number;
  pendingPayments: number;
  totalRevenue: number;
  todayRegistrations: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  categoryBreakdown: {
    '5K': number;
    '10K': number;
    'COMMUNITY': number;
  };
  paymentStats: {
    total: number;
    success: number;
    pending: number;
    failed: number;
    expired: number;
  };
  registrationTrend: Array<{
    date: string;
    registrations: number;
    payments: number;
  }>;
  recentActivities: Activity[];
}

export interface PaymentsListResponse {
  payments: Payment[];
  stats: PaymentStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter types
export interface ParticipantFilters {
  search?: string;
  category?: '5K' | '10K' | '';
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | '';
  type?: 'INDIVIDUAL' | 'COMMUNITY' | '';
  dateFrom?: string;
  dateTo?: string;
}

export interface PaymentFilters {
  search?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | '';
  method?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Bulk action types
export interface BulkAction {
  action: 'UPDATE_STATUS' | 'CONFIRM_PAYMENTS' | 'SEND_NOTIFICATION' | 'GENERATE_QR';
  participantIds: string[];
  data?: Record<string, unknown>;
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Export types
export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  fields?: string[];
  filters?: Record<string, unknown>;
  dateRange?: {
    from: string;
    to: string;
  };
}