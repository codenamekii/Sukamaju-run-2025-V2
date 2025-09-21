// app/api/admin/templates/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

interface TemplateCreateData {
  name: string;
  type: 'EMAIL' | 'WHATSAPP';
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
}

// GET - Fetch all templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === 'true';

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new template
export async function POST(request: NextRequest) {
  try {
    const body: TemplateCreateData = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.category || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract variables from content
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(body.content)) !== null) {
      variables.add(match[1]);
    }

    if (body.subject) {
      while ((match = variableRegex.exec(body.subject)) !== null) {
        variables.add(match[1]);
      }
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name: body.name,
        type: body.type,
        category: body.category,
        subject: body.subject,
        content: body.content,
        variables: Array.from(variables),
        isActive: body.isActive !== false
      }
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PATCH - Update template
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Re-extract variables if content is updated
    if (updateData.content || updateData.subject) {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables = new Set<string>();
      let match;

      if (updateData.content) {
        while ((match = variableRegex.exec(updateData.content)) !== null) {
          variables.add(match[1]);
        }
      }

      if (updateData.subject) {
        while ((match = variableRegex.exec(updateData.subject)) !== null) {
          variables.add(match[1]);
        }
      }

      updateData.variables = Array.from(variables);
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await prisma.messageTemplate.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}