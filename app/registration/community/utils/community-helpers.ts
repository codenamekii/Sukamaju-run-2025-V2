import { CommunityRegistrationData } from "@/lib/types/community-registration";
import { formatPhoneNumber } from "@/lib/utils/registration";

export interface CommunityRegistrationResult {
  name: string;
  registrationCode: string;
  bibNumber?: string;
  paymentCode?: string;
  communityRegistrationId?: string;
  communityRegistrationCode?: string;
  [key: string]: string | undefined; // kalau ada field lain dari backend
}

// Submit registration to API
export async function submitCommunityRegistration(data: CommunityRegistrationData) {
  const registrationResults: CommunityRegistrationResult[] = [];
  const failedRegistrations: unknown[] = [];

  let communityRegistrationId: string | null = null;
  let communityRegistrationCode: string | null = null;

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
        postalCode: "",
        category: data.category,
        bibName: member.bibName,
        jerseySize: member.jerseySize,
        emergencyName: member.emergencyName,
        emergencyPhone: formatPhoneNumber(member.emergencyPhone),
        emergencyRelation: member.emergencyRelation || "Keluarga",
        bloodType: member.bloodType || "",
        medicalHistory: member.medicalHistory || "",
        allergies: member.allergies || "",
        registrationType: "COMMUNITY",
        communityName: data.communityName,
      };

      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Simpan hasil per member
        registrationResults.push({
          name: member.fullName,
          ...result.data,
        });

        // Ambil communityRegistrationId/Code dari response pertama yang sukses
        if (!communityRegistrationId) {
          communityRegistrationId =
            result.data?.communityRegistrationId ||
            result.data?.community_registration_id ||
            null;
        }
        if (!communityRegistrationCode) {
          communityRegistrationCode =
            result.data?.communityRegistrationCode ||
            result.data?.registrationCode ||
            null;
        }
      } else {
        failedRegistrations.push({
          name: member.fullName,
          error: result.error || "Registration failed",
        });
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      failedRegistrations.push({
        name: member.fullName,
        error: "Network error",
      });
    }
  }

  return {
    registrationResults,
    failedRegistrations,
    communityRegistrationId,
    communityRegistrationCode,
  };
}