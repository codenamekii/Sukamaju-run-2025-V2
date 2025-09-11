// app/api/admin/export/participants/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Optional filters from query params
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (status) where.registrationStatus = status;
    if (type) where.registrationType = type;

    // Fetch all participants with relations
    const participants = await prisma.participant.findMany({
      where,
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        racePack: true,
        communityMember: {
          include: {
            communityRegistration: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Transform data for export
    const exportData = participants.map((p, index) => ({
      'No': index + 1,
      'Registration Code': p.registrationCode,
      'BIB Number': p.bibNumber || '-',
      'Full Name': p.fullName,
      'Email': p.email,
      'WhatsApp': p.whatsapp,
      'Gender': p.gender,
      'Date of Birth': new Date(p.dateOfBirth).toLocaleDateString('id-ID'),
      'Category': p.category,
      'Jersey Size': p.jerseySize,
      'Type': p.registrationType,
      'Status': p.registrationStatus,
      'Emergency Contact': p.emergencyName,
      'Emergency Phone': p.emergencyPhone,
      'Emergency Relation': p.emergencyRelation,
      'Province': p.province,
      'City': p.city,
      'Address': p.address,
      'Medical History': p.medicalHistory || '-',
      'Allergies': p.allergies || '-',
      'Total Price': p.totalPrice,
      'Payment Status': p.payments[0]?.status || 'NO PAYMENT',
      'Community': p.communityMember?.communityRegistration?.communityName || '-',
      'Race Pack Collected': p.racePack?.isCollected ? 'Yes' : 'No',
      'Registration Date': new Date(p.createdAt).toLocaleString('id-ID')
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // No
      { wch: 20 },  // Registration Code
      { wch: 15 },  // BIB Number
      { wch: 25 },  // Full Name
      { wch: 30 },  // Email
      { wch: 15 },  // WhatsApp
      { wch: 10 },  // Gender
      { wch: 15 },  // Date of Birth
      { wch: 10 },  // Category
      { wch: 10 },  // Jersey Size
      { wch: 12 },  // Type
      { wch: 12 },  // Status
      { wch: 20 },  // Emergency Contact
      { wch: 15 },  // Emergency Phone
      { wch: 15 },  // Emergency Relation
      { wch: 15 },  // Province
      { wch: 15 },  // City
      { wch: 40 },  // Address
      { wch: 30 },  // Medical History
      { wch: 30 },  // Allergies
      { wch: 15 },  // Total Price
      { wch: 15 },  // Payment Status
      { wch: 25 },  // Community
      { wch: 15 },  // Race Pack
      { wch: 20 }   // Registration Date
    ];
    ws['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Participants');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="participants-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error exporting participants:', error);
    return NextResponse.json(
      { error: 'Failed to export participants' },
      { status: 500 }
    );
  }
}