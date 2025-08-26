import { PROVINCES } from '@/lib/types/registration';
import { z } from 'zod';

// Helper function to calculate age
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Custom validators
const indonesianPhoneRegex = /^(08|628|\+628)[0-9]{8,12}$/;
const identityNumberRegex = /^[0-9]{16}$/;
const bibNameRegex = /^[A-Za-z0-9 ]{1,10}$/;

// Base schema for personal information
export const personalInfoSchema = z.object({
  fullName: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s]+$/, 'Nama hanya boleh berisi huruf'),

  gender: z.enum(['L', 'P'], {
    error: 'Pilih jenis kelamin'
  }),

  dateOfBirth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      return birthDate < new Date();
    }, 'Tanggal lahir tidak valid'),

  identityNumber: z
    .string()
    .regex(identityNumberRegex, 'NIK harus 16 digit angka'),

  nationality: z.enum(['WNI', 'WNA'],)
    .refine(val => ['WNI', 'WNA'].includes(val), {
      message: 'Pilih kewarganegaraan'
    }),
});

// Contact information schema
export const contactInfoSchema = z.object({
  whatsapp: z
    .string()
    .regex(indonesianPhoneRegex, 'Format nomor WhatsApp tidak valid (contoh: 08123456789)'),

  email: z
    .string()
    .email('Email tidak valid')
    .max(100, 'Email terlalu panjang'),

  address: z
    .string()
    .min(20, 'Alamat minimal 20 karakter')
    .max(500, 'Alamat maksimal 500 karakter'),

  city: z
    .string()
    .min(3, 'Nama kota minimal 3 karakter')
    .max(50, 'Nama kota maksimal 50 karakter'),

  province: z.enum(PROVINCES)
    .refine(val => PROVINCES.includes(val), {
      message: 'Pilih provinsi'
    }),
});

// Race information schema
export const raceInfoSchema = z.object({
  category: z.enum(['5K', '10K', 'COMMUNITY'])
    .refine(val => ['5K', '10K', 'COMMUNITY'].includes(val), {
      message: 'Pilih kategori lomba'
    }),

  bibName: z
    .string()
    .regex(bibNameRegex, 'Nama BIB maksimal 10 karakter (huruf & angka)')
    .transform(val => val.toUpperCase()),

  jerseySize: z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
    .refine(val => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(val), {
      message: 'Pilih ukuran jersey'
    }),

  runningCommunity: z
    .string()
    .max(100, 'Nama komunitas maksimal 100 karakter')
    .optional(),

  estimatedTime: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format waktu tidak valid (HH:MM)')
    .optional(),
});

// Emergency contact schema
export const emergencyContactSchema = z.object({
  emergencyName: z
    .string()
    .min(3, 'Nama kontak darurat minimal 3 karakter')
    .max(100, 'Nama kontak darurat maksimal 100 karakter'),

  emergencyRelation: z.enum(['Keluarga', 'Teman', 'Lainnya'])
    .refine(val => ['Keluarga', 'Teman', 'Lainnya'].includes(val), {
      message: 'Pilih hubungan'
    }),

  emergencyPhone: z
    .string()
    .regex(indonesianPhoneRegex, 'Format nomor telepon tidak valid'),

  medicalHistory: z
    .string()
    .max(500, 'Riwayat kesehatan maksimal 500 karakter')
    .optional(),

  allergies: z
    .string()
    .max(200, 'Informasi alergi maksimal 200 karakter')
    .optional(),

  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  .refine(val => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(val), {
    message: 'Pilih golongan darah'
  }),
});

// Terms agreement schema
export const termsAgreementSchema = z.object({
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'Anda harus menyetujui syarat dan ketentuan'),

  agreeToHealth: z
    .boolean()
    .refine(val => val === true, 'Anda harus menyatakan dalam kondisi sehat'),

  agreeToRefund: z
    .boolean()
    .refine(val => val === true, 'Anda harus menyetujui kebijakan pengembalian'),

  agreeToData: z
    .boolean()
    .refine(val => val === true, 'Anda harus menyatakan data yang diisi benar'),
});

// Complete registration schema
export const registrationSchema = z
  .object({})
  .merge(personalInfoSchema)
  .merge(contactInfoSchema)
  .merge(raceInfoSchema)
  .merge(emergencyContactSchema)
  .merge(termsAgreementSchema)
  .superRefine((data, ctx) => {
    // Age validation based on category
    const age = calculateAge(data.dateOfBirth);
    const minAge = data.category === '5K' ? 12 : 17;

    if (age < minAge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Usia minimal untuk kategori ${data.category} adalah ${minAge} tahun`,
        path: ['dateOfBirth'],
      });
    }

    // Community category validation
    if (data.category === 'COMMUNITY') {
      // Additional validation for community registration
      // This would be handled separately in community form
    }
  });

// Schema for each step
export const step1Schema = z.object({
  category: z.enum(['5K', '10K', 'COMMUNITY']),
});

export const step2Schema = personalInfoSchema
  .merge(contactInfoSchema)
  .merge(raceInfoSchema);

export const step3Schema = emergencyContactSchema;

export const step4Schema = termsAgreementSchema;

// Type exports
export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type RaceInfo = z.infer<typeof raceInfoSchema>;
export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type TermsAgreement = z.infer<typeof termsAgreementSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;