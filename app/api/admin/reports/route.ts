import {
  getCheckInReport,
  getDemographicsReport,
  getOverviewReport,
  getPerformanceReport,
  getRegistrationReport,
  getRevenueReport
} from '@/lib/services/report.services';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Generate various reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'overview';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let reportData: Record<string, unknown> = {};

    switch (reportType) {
      case 'overview':
        reportData = await getOverviewReport(dateFrom, dateTo);
        break;
      case 'registration':
        reportData = await getRegistrationReport(dateFrom, dateTo);
        break;
      case 'revenue':
        reportData = await getRevenueReport(dateFrom, dateTo);
        break;
      case 'demographics':
        reportData = await getDemographicsReport();
        break;
      case 'checkin':
        reportData = await getCheckInReport();
        break;
      case 'performance':
        reportData = await getPerformanceReport(dateFrom, dateTo);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({
      type: reportType,
      generatedAt: new Date(),
      data: reportData
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// POST - Export report as Excel/PDF
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportType, format, dateFrom, dateTo } = body;

    // Validate input
    if (!reportType || !format) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate report data
    let reportData: Record<string, unknown> = {};

    switch (reportType) {
      case 'overview':
        reportData = await getOverviewReport(dateFrom, dateTo);
        break;
      case 'registration':
        reportData = await getRegistrationReport(dateFrom, dateTo);
        break;
      case 'revenue':
        reportData = await getRevenueReport(dateFrom, dateTo);
        break;
      case 'demographics':
        reportData = await getDemographicsReport();
        break;
      case 'checkin':
        reportData = await getCheckInReport();
        break;
      case 'performance':
        reportData = await getPerformanceReport(dateFrom, dateTo);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // In production, you would generate actual Excel/PDF here using libraries like:
    // - ExcelJS for Excel files
    // - PDFKit or jsPDF for PDF files
    // For now, return JSON data with a mock download URL

    const exportId = `export_${reportType}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      format,
      exportId,
      data: reportData,
      downloadUrl: `/api/admin/reports/download?id=${exportId}`,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour expiry
    });
  } catch (error) {
    console.error('Report export error:', error);
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}