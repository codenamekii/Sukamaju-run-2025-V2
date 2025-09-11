import { AuthService } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST_LOGOUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-token');

    if (token) {
      // Verify token to get admin info for logging
      const admin = await AuthService.verifyToken(token.value);

      if (admin) {
        // Log the logout
        await prisma.adminLog.create({
          data: {
            adminId: admin.id,
            action: 'LOGOUT',
            details: {
              timestamp: new Date().toISOString()
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
            userAgent: request.headers.get('user-agent') || null
          }
        });
      }
    }

    // Clear cookie
    cookieStore.delete('admin-token');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, still clear the cookie
    const cookieStore = await cookies();
    cookieStore.delete('admin-token');

    return NextResponse.json({
      success: true,
      message: 'Logged out'
    });
  }
}