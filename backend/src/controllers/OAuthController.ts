import { Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService';

export class OAuthController {
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = new OAuthService();
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID token is required'
        });
        return;
      }

      // Verify Google token
      const userData = await this.oauthService.verifyGoogleToken(idToken);

      // Authenticate user
      const result = await this.oauthService.authenticateOAuthUser(userData);

      res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Google account linked successfully' : 'Login successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn,
          isNewUser: result.isNewUser
        }
      });
    } catch (error) {
      console.error('Google OAuth error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid Google token')) {
          res.status(401).json({
            success: false,
            message: 'Invalid Google token'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Google authentication failed'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Google authentication failed'
        });
      }
    }
  }

  async appleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          message: 'Apple ID token is required'
        });
        return;
      }

      // Verify Apple token
      const userData = await this.oauthService.verifyAppleToken(idToken);

      // Authenticate user
      const result = await this.oauthService.authenticateOAuthUser(userData);

      res.status(200).json({
        success: true,
        message: result.isNewUser ? 'Apple account linked successfully' : 'Login successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn,
          isNewUser: result.isNewUser
        }
      });
    } catch (error) {
      console.error('Apple OAuth error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid Apple token')) {
          res.status(401).json({
            success: false,
            message: 'Invalid Apple token'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Apple authentication failed'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Apple authentication failed'
        });
      }
    }
  }

  async linkOAuthAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { provider, idToken } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!provider || !idToken) {
        res.status(400).json({
          success: false,
          message: 'Provider and ID token are required'
        });
        return;
      }

      let userData;
      if (provider === 'google') {
        userData = await this.oauthService.verifyGoogleToken(idToken);
      } else if (provider === 'apple') {
        userData = await this.oauthService.verifyAppleToken(idToken);
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid provider. Supported providers: google, apple'
        });
        return;
      }

      // Link OAuth account to existing user
      await this.oauthService.linkOAuthToExistingAccount(
        userId,
        provider,
        userData.oauthId,
        userData.email
      );

      res.status(200).json({
        success: true,
        message: `${provider} account linked successfully`
      });
    } catch (error) {
      console.error('Link OAuth account error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already linked to another user')) {
          res.status(409).json({
            success: false,
            message: 'OAuth account is already linked to another user'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to link OAuth account'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to link OAuth account'
        });
      }
    }
  }

  async unlinkOAuthAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { provider } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      if (!provider) {
        res.status(400).json({
          success: false,
          message: 'Provider is required'
        });
        return;
      }

      if (!['google', 'apple'].includes(provider)) {
        res.status(400).json({
          success: false,
          message: 'Invalid provider. Supported providers: google, apple'
        });
        return;
      }

      // Unlink OAuth account
      await this.oauthService.unlinkOAuthAccount(userId, provider as 'google' | 'apple');

      res.status(200).json({
        success: true,
        message: `${provider} account unlinked successfully`
      });
    } catch (error) {
      console.error('Unlink OAuth account error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Cannot unlink OAuth account without setting a password')) {
          res.status(400).json({
            success: false,
            message: 'Please set a password before unlinking your OAuth account'
          });
        } else if (error.message.includes('OAuth account not linked')) {
          res.status(400).json({
            success: false,
            message: 'OAuth account is not linked'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to unlink OAuth account'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to unlink OAuth account'
        });
      }
    }
  }
} 