// app/api/admin/auth/check/route.ts
import { AuthService } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('admin-token');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await AuthService.verifyToken(token.value);

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}