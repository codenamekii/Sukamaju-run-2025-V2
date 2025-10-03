import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface TemplateMetadata {
  name?: string;
  variables?: string[];
  usageCount?: number;
  lastUsed?: string;
}

// Type definition untuk params
type Params = {
  params: Promise<{
    id: string;
  }>;
};

// Helper: parse metadata dengan aman
function parseMetadata(value: object | null | undefined): TemplateMetadata {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, string | number | string[] | undefined>;
    return {
      name: typeof obj.name === 'string' ? obj.name : undefined,
      variables: Array.isArray(obj.variables) ? obj.variables.map(v => String(v)) : [],
      usageCount: typeof obj.usageCount === 'number' ? obj.usageCount : 0,
      lastUsed: typeof obj.lastUsed === 'string' ? obj.lastUsed : undefined
    };
  }
  return {};
}

// GET single template
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const template = await prisma.notification.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const metadata = parseMetadata(template.metadata as object | null);

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: metadata.name || 'Unnamed Template',
        type: template.type,
        category: template.category,
        subject: template.subject,
        content: template.message,
        variables: metadata.variables || [],
        isActive: template.status === 'ACTIVE',
        usageCount: metadata.usageCount || 0,
        lastUsed: metadata.lastUsed,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

// PATCH update template
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, category, subject, content, variables, isActive } = body;

    const currentTemplate = await prisma.notification.findUnique({
      where: { id }
    });

    if (!currentTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const currentMetadata = parseMetadata(currentTemplate.metadata as object | null);

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        type: type || currentTemplate.type,
        category: category || currentTemplate.category,
        subject: subject !== undefined ? subject : currentTemplate.subject,
        message: content || currentTemplate.message,
        status: isActive !== undefined ? (isActive ? 'ACTIVE' : 'INACTIVE') : currentTemplate.status,
        metadata: {
          ...currentMetadata,
          name: name || currentMetadata.name,
          variables: variables || currentMetadata.variables || []
        }
      }
    });

    const updatedMetadata = parseMetadata(updated.metadata as object | null);

    return NextResponse.json({
      success: true,
      template: {
        id: updated.id,
        name: updatedMetadata.name,
        type: updated.type,
        category: updated.category,
        subject: updated.subject,
        content: updated.message,
        variables: updatedMetadata.variables || [],
        isActive: updated.status === 'ACTIVE',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

// DELETE template
export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    await prisma.notification.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}