import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET - Fetch all promotions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const where: Record<string, unknown> = {};

    if (status === 'active') {
      where.isActive = true;
      where.validFrom = { lte: new Date() };
      where.validUntil = { gte: new Date() };
    } else if (status === 'expired') {
      where.validUntil = { lt: new Date() };
    } else if (status === 'upcoming') {
      where.validFrom = { gt: new Date() };
    }

    if (type) {
      where.type = type;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        _count: {
          select: {
            usages: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get promotion statistics
    const stats = await prisma.promotion.aggregate({
      _count: true,
      _sum: {
        usageCount: true,
        maxUsage: true
      }
    });

    const activeCount = await prisma.promotion.count({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() }
      }
    });

    return NextResponse.json({
      promotions,
      stats: {
        total: stats._count,
        active: activeCount,
        totalUsage: stats._sum.usageCount || 0,
        totalMaxUsage: stats._sum.maxUsage || 0
      }
    });
  } catch (error) {
    console.error('Promotions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promotions' },
      { status: 500 }
    );
  }
}

// POST - Create new promotion
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      description,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validUntil,
      maxUsage,
      categories,
      isActive
    } = body;

    // Validate required fields
    if (!code || !type || !value) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if promo code already exists
    const existing = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Promo code already exists' },
        { status: 400 }
      );
    }

    // Create promotion
    const promotion = await prisma.promotion.create({
      data: {
        code: code.toUpperCase(),
        description,
        type, // PERCENTAGE or FIXED
        value,
        minPurchase: minPurchase || 0,
        maxDiscount: maxDiscount || null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUsage: maxUsage || null,
        usageCount: 0,
        categories: categories || [],
        isActive: isActive !== false,
        createdBy: session.user?.email
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'PROMOTION_CREATED',
        entityType: 'PROMOTION',
        entityId: promotion.id,
        details: {
          code: promotion.code,
          type: promotion.type,
          value: promotion.value,
          createdBy: session.user?.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      promotion
    });
  } catch (error) {
    console.error('Promotion creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create promotion' },
      { status: 500 }
    );
  }
}

// PATCH - Update promotion
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID required' },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id }
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Update promotion
    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'PROMOTION_UPDATED',
        entityType: 'PROMOTION',
        entityId: id,
        details: {
          code: updated.code,
          changes: updateData,
          updatedBy: session.user?.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      promotion: updated
    });
  } catch (error) {
    console.error('Promotion update error:', error);
    return NextResponse.json(
      { error: 'Failed to update promotion' },
      { status: 500 }
    );
  }
}

// DELETE - Delete promotion
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Promotion ID required' },
        { status: 400 }
      );
    }

    const promotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true }
        }
      }
    });

    if (!promotion) {
      return NextResponse.json(
        { error: 'Promotion not found' },
        { status: 404 }
      );
    }

    if (promotion._count.usages > 0) {
      return NextResponse.json(
        { error: 'Cannot delete promotion with usage history' },
        { status: 400 }
      );
    }

    // Delete promotion
    await prisma.promotion.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'PROMOTION_DELETED',
        entityType: 'PROMOTION',
        entityId: id,
        details: {
          code: promotion.code,
          deletedBy: session.user?.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Promotion deleted successfully'
    });
  } catch (error) {
    console.error('Promotion deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete promotion' },
      { status: 500 }
    );
  }
}