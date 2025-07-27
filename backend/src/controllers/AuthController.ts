import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, phone } = req.body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        res.status(400).json({
          success: false,
          message: 'Email, password, firstName, and lastName are required'
        });
        return;
      }

      // Register user
      const user = await this.authService.registerUser({
        email,
        password,
        firstName,
        lastName,
        phone
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          requiresKYC: user.kyc_status === 'pending'
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            message: error.message
          });
        } else if (error.message.includes('Password must')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Registration failed'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Registration failed'
        });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, mfaCode } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
        return;
      }

      // Login user
      const result = await this.authService.loginUser(email, password, mfaCode);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid credentials')) {
          res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        } else if (error.message.includes('MFA code required')) {
          res.status(401).json({
            success: false,
            message: 'MFA code required',
            requiresMFA: true
          });
        } else if (error.message.includes('Invalid MFA code')) {
          res.status(401).json({
            success: false,
            message: 'Invalid MFA code'
          });
        } else if (error.message.includes('not active')) {
          res.status(403).json({
            success: false,
            message: 'Account is not active'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Login failed'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Login failed'
        });
      }
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Refresh tokens
      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          expiresIn: result.expiresIn
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
        return;
      }

      // Logout user
      await this.authService.logout(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Logout all sessions
      await this.authService.logoutAllSessions(userId);

      res.status(200).json({
        success: true,
        message: 'All sessions logged out successfully'
      });
    } catch (error) {
      console.error('Logout all error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Logout all failed'
      });
    }
  }
} 