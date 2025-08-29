import { CommunityMember } from "@/lib/types/community-registration";
import { COMMUNITY_PRICING, JERSEY_ADDON, JERSEY_PLUS_SIZES } from "../constants/pricing";

// Empty member template
export const emptyMember: CommunityMember = {
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

// Calculate total price for community
export function calculateCommunityPrice(category: '5K' | '10K', members: CommunityMember[]) {
  const basePrice = COMMUNITY_PRICING[category].community;

  // Calculate jersey adjustments
  const jerseyAdjustments = members.map((member, index) => ({
    memberName: member.fullName || `Member ${index + 1}`,
    size: member.jerseySize,
    adjustment: JERSEY_PLUS_SIZES.includes(member.jerseySize) ? JERSEY_ADDON : 0
  }));

  const totalJerseyAdjustment = jerseyAdjustments.reduce((sum, item) => sum + item.adjustment, 0);

  const subtotal = basePrice * members.length;
  const totalPrice = subtotal + totalJerseyAdjustment;

  // Calculate savings vs individual
  const individualPrice = COMMUNITY_PRICING[category].individual;
  const totalIndividual = individualPrice * members.length + totalJerseyAdjustment;
  const savings = totalIndividual - totalPrice;

  return {
    basePrice,
    baseMembers: members.length,  // Total members that will be charged
    freeMembers: 0,                // No free members in current pricing model
    totalMembers: members.length,
    subtotal,                       // Base price * members before adjustments
    jerseyAdjustments,
    totalJerseyAdjustment,
    totalPrice,
    savings,
    pricePerPerson: Math.round(totalPrice / members.length),
    // Keep legacy fields for backward compatibility
    jerseyAddOnTotal: totalJerseyAdjustment,
    totalBase: subtotal
  };
}

// Format phone number to Indonesian format
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.substring(2);
  }

  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }

  return cleaned;
}

// Validate member age (minimum 12 years)
export function validateAge(dateOfBirth: string): boolean {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  return age >= 12;
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

// Validate community data for Step 1
export function validateCommunityInfo(data: any): string[] {
  const errors: string[] = [];

  if (!data.communityName) errors.push("Nama komunitas harus diisi");
  if (!data.picName) errors.push("Nama PIC harus diisi");
  if (!data.picWhatsapp) errors.push("WhatsApp PIC harus diisi");
  if (!data.picEmail) errors.push("Email PIC harus diisi");
  if (!data.address) errors.push("Alamat harus diisi");
  if (!data.city) errors.push("Kota harus diisi");
  if (!data.province) errors.push("Provinsi harus diisi");
  if (!data.category) errors.push("Kategori lari harus dipilih");

  return errors;
}

// Validate member data for Step 2
export function validateMembers(members: CommunityMember[]): string[] {
  const errors: string[] = [];

  if (members.length < 5) {
    errors.push("Minimal 5 peserta untuk registrasi komunitas");
  }

  members.forEach((member, index) => {
    const memberNum = `Member ${index + 1}`;

    if (!member.fullName) errors.push(`${memberNum}: Nama harus diisi`);
    if (!member.dateOfBirth) errors.push(`${memberNum}: Tanggal lahir harus diisi`);
    if (!member.identityNumber) errors.push(`${memberNum}: NIK harus diisi`);
    if (!member.email) errors.push(`${memberNum}: Email harus diisi`);
    if (!member.whatsapp) errors.push(`${memberNum}: WhatsApp harus diisi`);
    if (!member.bibName) errors.push(`${memberNum}: Nama BIB harus diisi`);
    if (!member.emergencyName) errors.push(`${memberNum}: Kontak darurat harus diisi`);
    if (!member.emergencyPhone) errors.push(`${memberNum}: No. darurat harus diisi`);

    if (member.dateOfBirth && !validateAge(member.dateOfBirth)) {
      errors.push(`${memberNum}: Usia minimal 12 tahun`);
    }
  });

  return errors;
}

// Submit registration to API
export async function submitCommunityRegistration(data: any) {
  const registrationResults = [];
  const failedRegistrations = [];

  for (const member of data.members) {
    try {
      const registrationData = {
        fullName: member.fullName,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
        idNumber: member.identityNumber,
        email: member.email,
        whatsapp: formatPhoneNumber(member.whatsapp),
        address: data.address,
        province: data.province,
        city: data.city,
        postalCode: '',
        category: data.category,
        bibName: member.bibName,
        jerseySize: member.jerseySize,
        emergencyName: member.emergencyName,
        emergencyPhone: formatPhoneNumber(member.emergencyPhone),
        emergencyRelation: member.emergencyRelation || 'Keluarga',
        bloodType: member.bloodType || '',
        medicalHistory: member.medicalHistory || '',
        allergies: member.allergies || '',
        registrationType: 'COMMUNITY',
        communityName: data.communityName
      };

      const response = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        registrationResults.push({
          name: member.fullName,
          ...result.data
        });
      } else {
        failedRegistrations.push({
          name: member.fullName,
          error: result.error || 'Registration failed'
        });
      }
    } catch (error) {
      failedRegistrations.push({
        name: member.fullName,
        error: 'Network error'
      });
    }
  }

  return { registrationResults, failedRegistrations };
}