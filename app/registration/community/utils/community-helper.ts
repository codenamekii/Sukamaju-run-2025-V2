// app/registration/community/utils/community-helpers.ts

import {
  CommunityMember,
  CommunityRegistrationData,
} from "@/lib/types/community-registration";
import { formatPhoneNumber } from "@/lib/utils/registration";
import { COMMUNITY_PRICING, JERSEY_ADDON } from "../constants/pricing";

// Hasil response registrasi komunitas
export interface CommunityRegistrationResult {
  name: string;
  registrationCode: string;
  bibNumber?: string;
  paymentCode?: string;
  communityRegistrationId?: string;
  communityRegistrationCode?: string;
  [key: string]: string | undefined;
}

// Data member kosong (default untuk tambah anggota baru)
export const emptyMember: CommunityMember = {
  fullName: "",
  gender: "L",
  dateOfBirth: "",
  identityNumber: "",
  email: "",
  whatsapp: "",
  address: "",
  province: "",
  city: "",
  postalCode: "",
  category: "5K",
  bibName: "",
  jerseySize: "M",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelation: "Keluarga",
  bloodType: "A+",
  medicalHistory: "",
  allergies: "",
  nationality: "WNI",
  idNumber: "",
  estimatedTime: ""
};

// Kalkulasi harga komunitas
export function calculateCommunityPrice(
  category: "5K" | "10K",
  members: CommunityMember[]
) {
  const basePrice = COMMUNITY_PRICING[category].community;
  const totalMembers = members.length;

  // base price × jumlah anggota
  const totalBase = totalMembers * basePrice;

  // minimal anggota yang bayar
  const baseMembers = totalMembers;
  const freeMembers = 0;

  // biaya tambahan jersey XXL/XXXL
  const jerseyAdjustments = members.map((m, i) => {
    const adjustment =
      m.jerseySize === "XXL" || m.jerseySize === "XXXL" ? JERSEY_ADDON : 0;
    return {
      memberName: m.fullName || `Member ${i + 1}`,
      size: m.jerseySize,
      adjustment,
    };
  });

  const jerseyAddOnTotal = jerseyAdjustments.reduce(
    (sum, j) => sum + j.adjustment,
    0
  );

  // total harga
  const subtotal = baseMembers * basePrice;
  const totalPrice = subtotal + jerseyAddOnTotal;
  const pricePerPerson = totalPrice / totalMembers;

  return {
    basePrice,
    baseMembers,
    freeMembers,
    totalMembers,
    subtotal,
    jerseyAdjustments,
    totalJerseyAdjustment: jerseyAddOnTotal,
    jerseyAddOnTotal,
    totalBase,
    totalPrice,
    pricePerPerson,
    savings:
      (COMMUNITY_PRICING[category].individual - basePrice) * totalMembers,
  };
}

// Validasi Step 1 (informasi komunitas)
export function validateCommunityInfo(
  data: CommunityRegistrationData
): string[] {
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

// Validasi Step 2 (anggota minimal 5 orang + field wajib)
export function validateMembers(members: CommunityMember[]): string[] {
  const errors: string[] = [];

  if (members.length < 5) {
    errors.push("Minimal 5 peserta untuk registrasi komunitas");
  }

  members.forEach((member, index) => {
    const memberNum = `Member ${index + 1}`;

    if (!member.fullName) errors.push(`${memberNum}: Nama harus diisi`);
    if (!member.dateOfBirth)
      errors.push(`${memberNum}: Tanggal lahir harus diisi`);
    if (!member.identityNumber)
      errors.push(`${memberNum}: NIK harus diisi`);
    if (!member.email) errors.push(`${memberNum}: Email harus diisi`);
    if (!member.whatsapp)
      errors.push(`${memberNum}: WhatsApp harus diisi`);
    if (!member.bibName) errors.push(`${memberNum}: Nama BIB harus diisi`);
    if (!member.emergencyName)
      errors.push(`${memberNum}: Kontak darurat harus diisi`);
    if (!member.emergencyPhone)
      errors.push(`${memberNum}: No. darurat harus diisi`);
  });

  return errors;
}

// FIXED: Submit registrasi ke API endpoint yang benar
export async function submitCommunityRegistration(
  data: CommunityRegistrationData
) {
  try {
    console.log('Submitting community registration to /api/registration/community');

    // Format member data
    const formattedMembers = data.members.map(member => ({
      fullName: member.fullName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth,
      idNumber: member.identityNumber || member.idNumber, // Handle both field names
      email: member.email,
      whatsapp: formatPhoneNumber(member.whatsapp),
      bibName: member.bibName,
      jerseySize: member.jerseySize,
      emergencyName: member.emergencyName,
      emergencyPhone: formatPhoneNumber(member.emergencyPhone),
      emergencyRelation: member.emergencyRelation || "Keluarga",
      bloodType: member.bloodType || "",
      medicalHistory: member.medicalHistory || "",
      allergies: member.allergies || "",
      estimatedTime: member.estimatedTime || ""
    }));

    // Send to COMMUNITY endpoint, not individual
    const response = await fetch("/api/registration/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Community info
        communityName: data.communityName,
        communityType: 'RUNNING_CLUB',
        address: data.address,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode || "",

        // PIC info
        picName: data.picName,
        picWhatsapp: formatPhoneNumber(data.picWhatsapp),
        picEmail: data.picEmail,
        picPosition: data.picPosition || "PIC",

        // Race info
        category: data.category,

        // Members
        members: formattedMembers
      }),
    });

    const result = await response.json();
    console.log('Community registration response:', result);

    if (!response.ok) {
      throw new Error(result.error || "Registration failed");
    }

    // Return in expected format
    return {
      registrationResults: result.data.members || [],
      failedRegistrations: [],
      communityRegistrationId: result.data.registrationCode, // Use the community registration code
      communityRegistrationCode: result.data.registrationCode
    };

  } catch (error) {
    console.error("Community registration error:", error);
    throw error;
  }
}