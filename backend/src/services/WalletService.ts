import { XRPLService } from './XRPLService';
import { Wallet } from 'xrpl';
import WalletModel from '../models/Wallet';
import WalletSignerModel from '../models/WalletSigner';
import User from '../models/User';
import { LoggingService } from './LoggingService';
import * as crypto from 'crypto';

interface CreateWalletRequest {
  name: string;
  description?: string;
  userId: string;
  signers: Array<{
    userId: string;
    weight: number;
  }>;
  quorum: number;
  network: 'mainnet' | 'testnet' | 'devnet';
}

interface WalletDetails {
  id: string;
  name: string;
  description?: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  network: string;
  status: string;
  quorum: number;
  signers: Array<{
    id: string;
    userId: string;
    userEmail: string;
    weight: number;
    status: string;
  }>;
  balance?: {
    xrp: string;
    tokens: Array<{
      currency: string;
      value: string;
      issuer?: string;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface WalletSignerInfo {
  id: string;
  userId: string;
  userEmail: string;
  weight: number;
  status: string;
  addedAt: Date;
}

export class WalletService {
  private xrplService: XRPLService;

  constructor() {
    this.xrplService = new XRPLService();
  }

  async createWallet(request: CreateWalletRequest): Promise<WalletDetails> {
    try {
      // Validate inputs
      if (request.signers.length === 0) {
        throw new Error('At least one signer is required');
      }

      if (request.quorum <= 0) {
        throw new Error('Quorum must be greater than 0');
      }

      const totalWeight = request.signers.reduce((sum, signer) => sum + signer.weight, 0);
      if (request.quorum > totalWeight) {
        throw new Error('Quorum cannot exceed total signer weight');
      }

      // Verify all signers exist
      const signerUsers = await User.findAll({
        where: {
          id: request.signers.map(s => s.userId)
        }
      });

      if (signerUsers.length !== request.signers.length) {
        throw new Error('One or more signers not found');
      }

      // Create XRPL wallet
      const xrplWallet = await this.xrplService.createWallet();

      // Encrypt private key
      const encryptionKey = process.env['WALLET_ENCRYPTION_KEY'] || 'default-key-change-in-production';
      const encryptedPrivateKey = this.encryptPrivateKey(xrplWallet.privateKey, encryptionKey);

      // Create wallet record
      const wallet = await WalletModel.create({
        name: request.name,
        description: request.description,
        address: xrplWallet.address,
        // public_key: xrplWallet.publicKey,
        // encrypted_private_key: encryptedPrivateKey,
        network: request.network,
        status: 'active',
        quorum: request.quorum,
        // created_by: request.userId,
        signature_scheme: 'weighted'
      });

      // Create signer records
      const signerEntries = [];
      for (const signer of request.signers) {
        const signerUser = signerUsers.find(u => u.id === signer.userId);
        if (!signerUser) continue;

        const walletSigner = await WalletSignerModel.create({
          wallet_id: wallet.id,
          user_id: signer.userId,
          weight: signer.weight,
          status: 'active',
          added_by: request.userId
        });

        signerEntries.push({
          address: signerUser.xrpl_address || '', // Will be set when user creates XRPL address
          weight: signer.weight
        });
      }

      // Setup multi-signature on XRPL (if master wallet has XRPL address)
      const masterUser = await User.findByPk(request.userId);
      if (masterUser?.xrpl_address) {
        const masterWallet = Wallet.fromSeed(masterUser.xrpl_seed || '');
        await this.xrplService.setupMultiSignature(masterWallet, signerEntries, request.quorum);
      }

      LoggingService.info('Wallet created successfully', {
        walletId: wallet.id,
        address: wallet.address,
        network: request.network,
        signerCount: request.signers.length,
        quorum: request.quorum
      });

      return await this.getWalletDetails(wallet.id);
    } catch (error) {
      LoggingService.error('Failed to create wallet', {
        request,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getWalletDetails(walletId: string): Promise<WalletDetails> {
    try {
      const wallet = await WalletModel.findByPk(walletId, {
        include: [
          {
            model: WalletSignerModel,
            include: [
              {
                model: User,
                attributes: ['id', 'email', 'first_name', 'last_name']
              }
            ]
          }
        ]
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Get balance from XRPL
      let balance;
      try {
        const xrplBalance = await this.xrplService.getBalance(wallet.address);
        balance = {
          xrp: xrplBalance.xrpBalance,
          tokens: xrplBalance.tokenBalances.map(token => ({
            currency: token.currency,
            value: token.value,
            issuer: token.issuer
          }))
        };
      } catch (error) {
        LoggingService.warn('Failed to get wallet balance', {
          walletId,
          address: wallet.address,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      return {
        id: wallet.id,
        name: wallet.name,
        description: wallet.description,
        address: wallet.address,
        publicKey: wallet.public_key,
        encryptedPrivateKey: wallet.encrypted_private_key,
        network: wallet.network,
        status: wallet.status,
        quorum: wallet.quorum,
        signers: wallet.wallet_signers?.map(signer => ({
          id: signer.id,
          userId: signer.user_id,
          userEmail: signer.user?.email || '',
          weight: signer.weight,
          status: signer.status
        })) || [],
        balance,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      };
    } catch (error) {
      LoggingService.error('Failed to get wallet details', {
        walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getUserWallets(userId: string): Promise<WalletDetails[]> {
    try {
      const wallets = await WalletModel.findAll({
        include: [
          {
            model: WalletSignerModel,
            where: { user_id: userId },
            include: [
              {
                model: User,
                attributes: ['id', 'email', 'first_name', 'last_name']
              }
            ]
          }
        ]
      });

      return await Promise.all(
        wallets.map(wallet => this.getWalletDetails(wallet.id))
      );
    } catch (error) {
      LoggingService.error('Failed to get user wallets', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async addSigner(walletId: string, userId: string, weight: number, addedBy: string): Promise<void> {
    try {
      const wallet = await WalletModel.findByPk(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is already a signer
      const existingSigner = await WalletSignerModel.findOne({
        where: {
          wallet_id: walletId,
          user_id: userId
        }
      });

      if (existingSigner) {
        throw new Error('User is already a signer for this wallet');
      }

      await WalletSignerModel.create({
        wallet_id: walletId,
        user_id: userId,
        weight,
        status: 'active',
        added_by: addedBy
      });

      LoggingService.info('Signer added to wallet', {
        walletId,
        userId,
        weight,
        addedBy
      });
    } catch (error) {
      LoggingService.error('Failed to add signer', {
        walletId,
        userId,
        weight,
        addedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async removeSigner(walletId: string, userId: string, removedBy: string): Promise<void> {
    try {
      const signer = await WalletSignerModel.findOne({
        where: {
          wallet_id: walletId,
          user_id: userId
        }
      });

      if (!signer) {
        throw new Error('Signer not found');
      }

      await signer.destroy();

      LoggingService.info('Signer removed from wallet', {
        walletId,
        userId,
        removedBy
      });
    } catch (error) {
      LoggingService.error('Failed to remove signer', {
        walletId,
        userId,
        removedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateSignerWeight(walletId: string, userId: string, weight: number, updatedBy: string): Promise<void> {
    try {
      const signer = await WalletSignerModel.findOne({
        where: {
          wallet_id: walletId,
          user_id: userId
        }
      });

      if (!signer) {
        throw new Error('Signer not found');
      }

      signer.weight = weight;
      await signer.save();

      LoggingService.info('Signer weight updated', {
        walletId,
        userId,
        weight,
        updatedBy
      });
    } catch (error) {
      LoggingService.error('Failed to update signer weight', {
        walletId,
        userId,
        weight,
        updatedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getWalletSigners(walletId: string): Promise<WalletSignerInfo[]> {
    try {
      const signers = await WalletSignerModel.findAll({
        where: { wallet_id: walletId },
        include: [
          {
            model: User,
            attributes: ['id', 'email', 'first_name', 'last_name']
          }
        ]
      });

      return signers.map(signer => ({
        id: signer.id,
        userId: signer.user_id,
        userEmail: signer.user?.email || '',
        weight: signer.weight,
        status: signer.status,
        addedAt: signer.created_at
      }));
    } catch (error) {
      LoggingService.error('Failed to get wallet signers', {
        walletId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateWalletStatus(walletId: string, status: string, updatedBy: string): Promise<void> {
    try {
      const wallet = await WalletModel.findByPk(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      wallet.status = status;
      await wallet.save();

      LoggingService.info('Wallet status updated', {
        walletId,
        status,
        updatedBy
      });
    } catch (error) {
      LoggingService.error('Failed to update wallet status', {
        walletId,
        status,
        updatedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private encryptPrivateKey(privateKey: string, encryptionKey: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptPrivateKey(encryptedPrivateKey: string, encryptionKey: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const [ivHex, authTagHex, encrypted] = encryptedPrivateKey.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, key);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
} 