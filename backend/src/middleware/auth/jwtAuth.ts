import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/User';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env['JWT_SECRET'] || 'default-secret-change-in-production';

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      email: string;
      role: string;
    };

    // Verify user still exists and is active
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      console.error('JWT authentication error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']); 