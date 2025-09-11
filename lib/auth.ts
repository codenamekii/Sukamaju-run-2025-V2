// lib/auth.ts
import { AdminUser } from '@/app/admin/dashboard/types';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-minimum-32-characters-long!!!'
);

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async generateToken(user: AdminUser): Promise<string> {
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return token;
  }

  static async verifyToken(token: string): Promise<AdminUser | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);

      return {
        id: payload.id as string,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as 'ADMIN' | 'SUPER_ADMIN' | 'VIEWER',
        isActive: true,
        lastLogin: null
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  static async validateSession(token: string | undefined): Promise<AdminUser | null> {
    if (!token) return null;
    return this.verifyToken(token);
  }
}