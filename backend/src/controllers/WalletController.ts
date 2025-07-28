import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { LoggingService } from '../services/LoggingService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { name, description, signers, quorum, network } = req.body;

      // Validate required fields
      if (!name || !signers || !quorum || !network) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, signers, quorum, network'
        });
        return;
      }

      // Validate network
      if (!['mainnet', 'testnet', 'devnet'].includes(network)) {
        res.status(400).json({
          success: false,
          message: 'Invalid network. Must be mainnet, testnet, or devnet'
        });
        return;
      }

      const wallet = await this.walletService.createWallet({
        name,
        description,
        userId,
        signers,
        quorum,
        network
      });

      res.status(201).json({
        success: true,
        message: 'Wallet created successfully',
        data: wallet
      });
    } catch (error) {
      LoggingService.error('Failed to create wallet', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('At least one signer is required')) {
          res.status(400).json({
            success: false,
            message: 'At least one signer is required'
          });
        } else if (error.message.includes('Quorum must be greater than 0')) {
          res.status(400).json({
            success: false,
            message: 'Quorum must be greater than 0'
          });
        } else if (error.message.includes('Quorum cannot exceed total signer weight')) {
          res.status(400).json({
            success: false,
            message: 'Quorum cannot exceed total signer weight'
          });
        } else if (error.message.includes('One or more signers not found')) {
          res.status(404).json({
            success: false,
            message: 'One or more signers not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to create wallet'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create wallet'
        });
      }
    }
  }

  async getWallet(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId } = req.params;

      const wallet = await this.walletService.getWalletDetails(walletId);

      // Check if user has access to this wallet
      const hasAccess = wallet.signers.some(signer => signer.userId === userId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this wallet'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: wallet
      });
    } catch (error) {
      LoggingService.error('Failed to get wallet', {
        userId: req.user?.userId,
        walletId: req.params.walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('Wallet not found')) {
          res.status(404).json({
            success: false,
            message: 'Wallet not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to get wallet'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to get wallet'
        });
      }
    }
  }

  async getUserWallets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const wallets = await this.walletService.getUserWallets(userId);

      res.status(200).json({
        success: true,
        data: wallets
      });
    } catch (error) {
      LoggingService.error('Failed to get user wallets', {
        userId: req.user?.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get user wallets'
      });
    }
  }

  async addSigner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId } = req.params;
      const { signerUserId, weight } = req.body;

      if (!signerUserId || !weight) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: signerUserId, weight'
        });
        return;
      }

      if (weight <= 0) {
        res.status(400).json({
          success: false,
          message: 'Weight must be greater than 0'
        });
        return;
      }

      await this.walletService.addSigner(walletId, signerUserId, weight, userId);

      res.status(200).json({
        success: true,
        message: 'Signer added successfully'
      });
    } catch (error) {
      LoggingService.error('Failed to add signer', {
        userId: req.user?.userId,
        walletId: req.params.walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('Wallet not found')) {
          res.status(404).json({
            success: false,
            message: 'Wallet not found'
          });
        } else if (error.message.includes('User not found')) {
          res.status(404).json({
            success: false,
            message: 'User not found'
          });
        } else if (error.message.includes('already a signer')) {
          res.status(409).json({
            success: false,
            message: 'User is already a signer for this wallet'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to add signer'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to add signer'
        });
      }
    }
  }

  async removeSigner(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId, signerUserId } = req.params;

      await this.walletService.removeSigner(walletId, signerUserId, userId);

      res.status(200).json({
        success: true,
        message: 'Signer removed successfully'
      });
    } catch (error) {
      LoggingService.error('Failed to remove signer', {
        userId: req.user?.userId,
        walletId: req.params.walletId,
        signerUserId: req.params.signerUserId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('Signer not found')) {
          res.status(404).json({
            success: false,
            message: 'Signer not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to remove signer'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to remove signer'
        });
      }
    }
  }

  async updateSignerWeight(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId, signerUserId } = req.params;
      const { weight } = req.body;

      if (!weight || weight <= 0) {
        res.status(400).json({
          success: false,
          message: 'Weight must be greater than 0'
        });
        return;
      }

      await this.walletService.updateSignerWeight(walletId, signerUserId, weight, userId);

      res.status(200).json({
        success: true,
        message: 'Signer weight updated successfully'
      });
    } catch (error) {
      LoggingService.error('Failed to update signer weight', {
        userId: req.user?.userId,
        walletId: req.params['walletId'],
        signerUserId: req.params['signerUserId'],
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('Signer not found')) {
          res.status(404).json({
            success: false,
            message: 'Signer not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update signer weight'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update signer weight'
        });
      }
    }
  }

  async getWalletSigners(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId } = req.params;

      const signers = await this.walletService.getWalletSigners(walletId);

      res.status(200).json({
        success: true,
        data: signers
      });
    } catch (error) {
      LoggingService.error('Failed to get wallet signers', {
        userId: req.user?.userId,
        walletId: req.params.walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Failed to get wallet signers'
      });
    }
  }

  async updateWalletStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { walletId } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'inactive', 'suspended'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active, inactive, or suspended'
        });
        return;
      }

      await this.walletService.updateWalletStatus(walletId, status, userId);

      res.status(200).json({
        success: true,
        message: 'Wallet status updated successfully'
      });
    } catch (error) {
      LoggingService.error('Failed to update wallet status', {
        userId: req.user?.userId,
        walletId: req.params.walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error) {
        if (error.message.includes('Wallet not found')) {
          res.status(404).json({
            success: false,
            message: 'Wallet not found'
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'Failed to update wallet status'
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to update wallet status'
        });
      }
    }
  }
} 