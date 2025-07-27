import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { Session } from '../models/Session';

interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    mfaEnabled: boolean;
  };
  expiresIn: number;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export class AuthService {
  private readonly saltRounds = 12;
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  async registerUser(userData: RegisterUserData): Promise<User> {
    const { email, password, firstName, lastName, phone } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      phone,
      role: 'user',
      status: 'active'
    });

    // Hash and set password
    await user.hashPassword(password);
    await user.save();

    return user;
  }

  async loginUser(email: string, password: string, mfaCode?: string): Promise<LoginResult> {
    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is not active');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Verify MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaCode) {
        throw new Error('MFA code required');
      }
      const isValidMFA = this.verifyMFA(user.mfa_secret!, mfaCode);
      if (!isValidMFA) {
        throw new Error('Invalid MFA code');
      }
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Create session
    await this.createSession(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        mfaEnabled: user.mfa_enabled
      },
      expiresIn: 900 // 15 minutes
    };
  }

  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as TokenPayload;
      
      // Find session
      const session = await Session.findOne({
        where: {
          refresh_token_hash: this.hashToken(refreshToken),
          is_active: true,
          expires_at: { [require('sequelize').Op.gt]: new Date() }
        }
      });

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Find user
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Update session
      session.refresh_token_hash = this.hashToken(newRefreshToken);
      session.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await session.save();

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          mfaEnabled: user.mfa_enabled
        },
        expiresIn: 900
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await Session.findOne({
      where: {
        refresh_token_hash: this.hashToken(refreshToken),
        is_active: true
      }
    });

    if (session) {
      session.is_active = false;
      await session.save();
    }
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await Session.update(
      { is_active: false },
      { where: { user_id: userId, is_active: true } }
    );
  }

  private generateAccessToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }

  private generateRefreshToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiry });
  }

  private async createSession(userId: string, refreshToken: string): Promise<void> {
    await Session.create({
      user_id: userId,
      refresh_token_hash: this.hashToken(refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      is_active: true
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  private verifyMFA(secret: string, code: string): boolean {
    // This is a simplified MFA verification
    // In production, use a proper TOTP library like 'speakeasy'
    try {
      // For now, return true if code is 6 digits
      return /^\d{6}$/.test(code);
    } catch (error) {
      return false;
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
} 