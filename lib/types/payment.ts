export interface RegistrationParticipant {
  id: string;
  fullName: string;
  category: string;
  bibNumber: string;
  jerseySize: string;
  basePrice: number;
  jerseyAddOn: number;
  totalPrice: number;
}

export interface RegistrationCommunity {
  id: string;
  communityName: string;
  category: string;
  totalMembers: number;
  finalPrice: number;
}

export interface RegistrationData {
  participant?: RegistrationParticipant;
  community?: RegistrationCommunity;
}