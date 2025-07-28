import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';

interface OAuthUserData {
  provider: 'google' | 'apple';
  oauthId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
}

interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    mfaEnabled: boolean;
    oauthProvider: string;
  };
  expiresIn: number;
  isNewUser: boolean;
}

export class OAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env['JWT_SECRET'] || 'default-secret-change-in-production';
    this.jwtExpiry = process.env['JWT_EXPIRY'] || '15m';
    this.refreshTokenExpiry = process.env['REFRESH_TOKEN_EXPIRY'] || '7d';
  }

  async authenticateOAuthUser(userData: OAuthUserData): Promise<OAuthResult> {
    const { provider, oauthId, email, firstName, lastName } = userData;

    // Check if user exists by OAuth ID
    let user = await User.findOne({
      where: {
        oauth_provider: provider,
        oauth_id: oauthId
      }
    });

    let isNewUser = false;

    if (!user) {
      // Check if user exists by email
      user = await User.findOne({
        where: { email: email.toLowerCase() }
      });

      if (user) {
        // Link existing account to OAuth
        user.oauth_provider = provider;
        user.oauth_id = oauthId;
        user.oauth_email = email;
        await user.save();
      } else {
        // Create new user
        isNewUser = true;
        user = await User.create({
          email: email.toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          oauth_provider: provider,
          oauth_id: oauthId,
          oauth_email: email,
          role: 'user',
          status: 'active',
          password_hash: await this.generateOAuthPassword(),
          kyc_status: 'pending',
          aml_status: 'pending',
          ofac_status: 'pending',
          risk_score: 0,
          mfa_enabled: false
        });
      }
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        mfaEnabled: user.mfa_enabled,
        oauthProvider: user.oauth_provider || provider
      },
      expiresIn: 900, // 15 minutes
      isNewUser
    };
  }

  async verifyGoogleToken(idToken: string): Promise<OAuthUserData> {
    try {
      // In production, verify the token with Google's API
      // For now, we'll decode the JWT (this should be replaced with proper verification)
      const decoded = jwt.decode(idToken) as any;
      
      if (!decoded || !decoded.sub || !decoded.email) {
        throw new Error('Invalid Google token');
      }

      return {
        provider: 'google',
        oauthId: decoded.sub,
        email: decoded.email,
        firstName: decoded.given_name || '',
        lastName: decoded.family_name || '',
        picture: decoded.picture
      };
    } catch (error) {
      throw new Error('Failed to verify Google token');
    }
  }

  async verifyAppleToken(idToken: string): Promise<OAuthUserData> {
    try {
      // In production, verify the token with Apple's API
      // For now, we'll decode the JWT (this should be replaced with proper verification)
      const decoded = jwt.decode(idToken) as any;
      
      if (!decoded || !decoded.sub || !decoded.email) {
        throw new Error('Invalid Apple token');
      }

      return {
        provider: 'apple',
        oauthId: decoded.sub,
        email: decoded.email,
        firstName: decoded.name?.firstName || '',
        lastName: decoded.name?.lastName || ''
      };
    } catch (error) {
      throw new Error('Failed to verify Apple token');
    }
  }

  private generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // @ts-ignore - JWT types issue
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiry });
  }

  private generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // @ts-ignore - JWT types issue
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.refreshTokenExpiry });
  }

  private async generateOAuthPassword(): Promise<string> {
    // Generate a secure random password for OAuth users
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(randomPassword, 12);
  }

  async linkOAuthToExistingAccount(userId: string, provider: 'google' | 'apple', oauthId: string, oauthEmail: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if OAuth account is already linked to another user
    const existingOAuthUser = await User.findOne({
      where: {
        oauth_provider: provider,
        oauth_id: oauthId
      }
    });

    if (existingOAuthUser && existingOAuthUser.id !== userId) {
      throw new Error('OAuth account is already linked to another user');
    }

    // Link OAuth account
    user.oauth_provider = provider;
    user.oauth_id = oauthId;
    user.oauth_email = oauthEmail;
    await user.save();
  }

  async unlinkOAuthAccount(userId: string, provider: 'google' | 'apple'): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.oauth_provider !== provider) {
      throw new Error('OAuth account not linked');
    }

    // Check if user has a password set
    if (!user.password_hash || user.password_hash === '') {
      throw new Error('Cannot unlink OAuth account without setting a password first');
    }

    // Unlink OAuth account
    (user as any).oauth_provider = undefined;
    (user as any).oauth_id = undefined;
    (user as any).oauth_email = undefined;
    await user.save();
  }
} 