import { Request, Response } from 'express';
import sequelize from '../config/database';

export class HealthController {
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      await sequelize.authenticate();
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: 'connected',
          redis: 'unknown', // TODO: Add Redis health check
          xrpl: 'unknown'   // TODO: Add XRPL health check
        }
      };

      res.status(200).json({
        success: true,
        data: healthData
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Service unhealthy',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          services: {
            database: 'disconnected',
            redis: 'unknown',
            xrpl: 'unknown'
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  static async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if application is ready to serve requests
      await sequelize.authenticate();
      
      res.status(200).json({
        success: true,
        message: 'Application is ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Application is not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async livenessCheck(req: Request, res: Response): Promise<void> {
    // Simple liveness check - just return OK if the process is running
    res.status(200).json({
      success: true,
      message: 'Application is alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
} 