import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(user: AdminUser): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  static verifyToken(token: string): AdminUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown;
      return {
        id: (decoded as { id: string }).id,
        email: (decoded as { email: string }).email,
        name: (decoded as { name: string }).name || '',
        role: (decoded as { role: string }).role
      };
    } catch {
      return null;
    }
  }
}
