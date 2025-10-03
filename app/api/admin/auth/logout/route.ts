import { AuthService } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies(); // pakai await
    const token = cookieStore.get("admin-token");

    if (token) {
      const admin = await AuthService.verifyToken(token.value);

      if (admin) {
        await prisma.adminLog.create({
          data: {
            adminId: admin.id,
            action: "LOGOUT",
            details: {
              timestamp: new Date().toISOString(),
            },
            ipAddress:
              request.headers.get("x-forwarded-for") ||
              request.headers.get("x-real-ip") ||
              null,
            userAgent: request.headers.get("user-agent") || null,
          },
        });
      }
    }

    // buat response
    const res = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // hapus cookie lewat response
    res.cookies.set("admin-token", "", { maxAge: 0 });

    return res;
  } catch (error) {
    console.error("Logout error:", error);

    const res = NextResponse.json({
      success: true,
      message: "Logged out",
    });

    res.cookies.set("admin-token", "", { maxAge: 0 });

    return res;
  }
}