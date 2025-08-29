// app/api/admin/export/route.ts
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const participants = await prisma.participant.findMany({
      include: {
        payments: {
          where: { status: 'SUCCESS' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format for Excel
    const data = participants.map((p, index) => ({
      'No': index + 1,
      'Kode Registrasi': p.registrationCode,
      'No BIB': p.bibNumber,
      'Nama Lengkap': p.fullName,
      'Jenis Kelamin': p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Kategori': p.category,
      'Email': p.email,
      'WhatsApp': p.whatsapp,
      'Ukuran Jersey': p.jerseySize,
      'Status': p.registrationStatus,
      'Total Bayar': p.totalPrice,
      'Tanggal Daftar': new Date(p.createdAt).toLocaleDateString('id-ID')
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peserta');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="peserta-sukamaju-run-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    );
  }
}