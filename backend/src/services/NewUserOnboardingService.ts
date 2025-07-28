import { XRPLService } from './XRPLService';
import { LoggingService } from './LoggingService';
import { UserWalletConnection } from '../models/UserWalletConnection';
import { WalletCreationRequest } from '../models/WalletCreationRequest';
import Wallet from '../models/Wallet';
import { ExternalSigner } from '../models/ExternalSigner';
// import { WalletImport } from '../models/WalletImport';
// import User from '../models/User';

export interface WalletConnectionRequest {
  public_address: string;
  wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
  nickname?: string;
  verification_signature: string;
  verification_message: string;
}

export interface WalletCreationRequestData {
  wallet_name: string;
  wallet_description?: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  signature_scheme: 'multi_sign' | 'weighted';
  quorum: number;
  signers: Array<{
    public_address: string;
    weight: number;
    nickname?: string;
  }>;
}

export interface SignerConfiguration {
  signers: Array<{
    public_address: string;
    weight: number;
    nickname?: string;
  }>;
  total_weight: number;
}

export class NewUserOnboardingService {
  private xrplService: XRPLService;

  constructor() {
    this.xrplService = new XRPLService();
  }

  /**
   * Connect user's wallet during signup
   */
  async connectUserWallet(
    userId: string,
    connectionRequest: WalletConnectionRequest
  ): Promise<UserWalletConnection> {
    try {
      LoggingService.info('Connecting user wallet during signup', {
        userId,
        publicAddress: connectionRequest.public_address,
        walletType: connectionRequest.wallet_type,
      });

      // Verify the signature to prove wallet ownership
      const isValidSignature = await this.verifyWalletOwnership(
        connectionRequest.public_address,
        connectionRequest.verification_message,
        connectionRequest.verification_signature
      );

      if (!isValidSignature) {
        throw new Error('Invalid signature - wallet ownership verification failed');
      }

      // Check if this wallet is already connected to another user
      const existingConnection = await UserWalletConnection.findOne({
        where: {
          public_address: connectionRequest.public_address,
        },
      });

      if (existingConnection) {
        throw new Error('This wallet is already connected to another user');
      }

      // Create wallet connection
      const walletConnection = await UserWalletConnection.create({
        user_id: userId,
        public_address: connectionRequest.public_address,
        wallet_type: connectionRequest.wallet_type || 'other',
        nickname: connectionRequest.nickname || '',
        is_primary: true, // First connected wallet is primary
        is_verified: true,
        verification_signature: connectionRequest.verification_signature,
        verification_message: connectionRequest.verification_message,
        verification_timestamp: new Date(),
      });

      LoggingService.info('Successfully connected user wallet', {
        userId,
        connectionId: walletConnection.id,
        publicAddress: walletConnection.public_address,
      });

      return walletConnection;
    } catch (error) {
      LoggingService.error('Failed to connect user wallet', {
        userId,
        publicAddress: connectionRequest.public_address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Start guided wallet creation process
   */
  async startWalletCreation(
    userId: string,
    creationData: WalletCreationRequestData
  ): Promise<WalletCreationRequest> {
    try {
      LoggingService.info('Starting guided wallet creation', {
        userId,
        walletName: creationData.wallet_name,
        network: creationData.network,
      });

      // Validate signer configuration
      const signerConfig = this.validateSignerConfiguration(creationData.signers, creationData.quorum);

      // Create wallet creation request
      const creationRequest = await WalletCreationRequest.create({
        user_id: userId,
        wallet_name: creationData.wallet_name,
        wallet_description: creationData.wallet_description || '',
        network: creationData.network,
        signature_scheme: creationData.signature_scheme,
        quorum: creationData.quorum,
        signer_configuration: signerConfig,
        status: 'pending',
      });

      // Start the wallet creation process
      await this.processWalletCreation(creationRequest.id);

      LoggingService.info('Wallet creation request created', {
        userId,
        requestId: creationRequest.id,
        status: creationRequest.status,
      });

      return creationRequest;
    } catch (error) {
      LoggingService.error('Failed to start wallet creation', {
        userId,
        walletName: creationData.wallet_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get wallet creation progress
   */
  async getWalletCreationProgress(requestId: string, userId: string): Promise<WalletCreationRequest> {
    try {
      const creationRequest = await WalletCreationRequest.findOne({
        where: {
          id: requestId,
          user_id: userId,
        },
      });

      if (!creationRequest) {
        throw new Error('Wallet creation request not found');
      }

      return creationRequest;
    } catch (error) {
      LoggingService.error('Failed to get wallet creation progress', {
        requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user's connected wallets
   */
  async getUserWallets(userId: string): Promise<UserWalletConnection[]> {
    try {
      return await UserWalletConnection.findAll({
        where: {
          user_id: userId,
        },
        order: [['is_primary', 'DESC'], ['created_at', 'ASC']],
      });
    } catch (error) {
      LoggingService.error('Failed to get user wallets', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add additional wallet connection
   */
  async addWalletConnection(
    userId: string,
    connectionRequest: WalletConnectionRequest
  ): Promise<UserWalletConnection> {
    try {
      LoggingService.info('Adding additional wallet connection', {
        userId,
        publicAddress: connectionRequest.public_address,
      });

      // Verify the signature
      const isValidSignature = await this.verifyWalletOwnership(
        connectionRequest.public_address,
        connectionRequest.verification_message,
        connectionRequest.verification_signature
      );

      if (!isValidSignature) {
        throw new Error('Invalid signature - wallet ownership verification failed');
      }

      // Check if this wallet is already connected
      const existingConnection = await UserWalletConnection.findOne({
        where: {
          public_address: connectionRequest.public_address,
        },
      });

      if (existingConnection) {
        throw new Error('This wallet is already connected');
      }

      // Create wallet connection (not primary)
      const walletConnection = await UserWalletConnection.create({
        user_id: userId,
        public_address: connectionRequest.public_address,
        wallet_type: connectionRequest.wallet_type,
        nickname: connectionRequest.nickname,
        is_primary: false,
        is_verified: true,
        verification_signature: connectionRequest.verification_signature,
        verification_message: connectionRequest.verification_message,
        verification_timestamp: new Date(),
      });

      LoggingService.info('Successfully added wallet connection', {
        userId,
        connectionId: walletConnection.id,
        publicAddress: walletConnection.public_address,
      });

      return walletConnection;
    } catch (error) {
      LoggingService.error('Failed to add wallet connection', {
        userId,
        publicAddress: connectionRequest.public_address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Set primary wallet
   */
  async setPrimaryWallet(userId: string, connectionId: string): Promise<void> {
    try {
      LoggingService.info('Setting primary wallet', {
        userId,
        connectionId,
      });

      // Get the wallet connection
      const walletConnection = await UserWalletConnection.findOne({
        where: {
          id: connectionId,
          user_id: userId,
        },
      });

      if (!walletConnection) {
        throw new Error('Wallet connection not found');
      }

      // Remove primary flag from all user's wallets
      await UserWalletConnection.update(
        { is_primary: false },
        {
          where: {
            user_id: userId,
            is_primary: true,
          },
        }
      );

      // Set this wallet as primary
      await walletConnection.update({ is_primary: true });

      LoggingService.info('Successfully set primary wallet', {
        userId,
        connectionId,
        publicAddress: walletConnection.public_address,
      });
    } catch (error) {
      LoggingService.error('Failed to set primary wallet', {
        userId,
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove wallet connection
   */
  async removeWalletConnection(userId: string, connectionId: string): Promise<void> {
    try {
      LoggingService.info('Removing wallet connection', {
        userId,
        connectionId,
      });

      const walletConnection = await UserWalletConnection.findOne({
        where: {
          id: connectionId,
          user_id: userId,
        },
      });

      if (!walletConnection) {
        throw new Error('Wallet connection not found');
      }

      // Don't allow removal of primary wallet if it's the only one
      if (walletConnection.is_primary) {
        const totalConnections = await UserWalletConnection.count({
          where: {
            user_id: userId,
          },
        });

        if (totalConnections <= 1) {
          throw new Error('Cannot remove the only connected wallet');
        }
      }

      await walletConnection.destroy();

      // If this was the primary wallet, set another as primary
      if (walletConnection.is_primary) {
        const nextPrimary = await UserWalletConnection.findOne({
          where: {
            user_id: userId,
          },
          order: [['created_at', 'ASC']],
        });

        if (nextPrimary) {
          await nextPrimary.update({ is_primary: true });
        }
      }

      LoggingService.info('Successfully removed wallet connection', {
        userId,
        connectionId,
        publicAddress: walletConnection.public_address,
      });
    } catch (error) {
      LoggingService.error('Failed to remove wallet connection', {
        userId,
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process wallet creation workflow
   */
  private async processWalletCreation(requestId: string): Promise<void> {
    try {
      const creationRequest = await WalletCreationRequest.findByPk(requestId);
      if (!creationRequest) {
        throw new Error('Wallet creation request not found');
      }

      // Step 1: Generate wallet
      await this.generateWallet(creationRequest);

      // Step 2: Blackhole master key
      await this.blackholeMasterKey(creationRequest);

      // Step 3: Add signers
      await this.addSigners(creationRequest);

      // Step 4: Complete setup
      await this.completeWalletSetup(creationRequest);

    } catch (error) {
      LoggingService.error('Failed to process wallet creation', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Update request status to failed
      await WalletCreationRequest.update(
        {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        },
        {
          where: { id: requestId },
        }
      );
    }
  }

  /**
   * Generate new XRPL wallet
   */
  private async generateWallet(creationRequest: WalletCreationRequest): Promise<void> {
    try {
      LoggingService.info('Generating new XRPL wallet', {
        requestId: creationRequest.id,
      });

      // Generate wallet using XRPL service
      const wallet = await this.xrplService.createWallet(creationRequest.network);

      // Update creation request
      await creationRequest.update({
        status: 'wallet_created',
        generated_address: wallet.address,
        generated_master_key: wallet.privateKey, // Temporary storage for blackholing
      });

      LoggingService.info('Successfully generated wallet', {
        requestId: creationRequest.id,
        address: wallet.address,
      });
    } catch (error) {
      LoggingService.error('Failed to generate wallet', {
        requestId: creationRequest.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Blackhole the master key
   */
  private async blackholeMasterKey(creationRequest: WalletCreationRequest): Promise<void> {
    try {
      LoggingService.info('Blackholing master key', {
        requestId: creationRequest.id,
        address: creationRequest.generated_address,
      });

      if (!creationRequest.generated_address || !creationRequest.generated_master_key) {
        throw new Error('Wallet not generated yet');
      }

      // Create blackhole transaction
      const blackholeTransaction = await this.xrplService.createBlackholeTransaction(
        creationRequest.generated_address,
        creationRequest.generated_master_key
      );

      // Submit transaction
      const result = await this.xrplService.submitTransaction(blackholeTransaction);

      // Update creation request
      await creationRequest.update({
        status: 'blackhole_completed',
        blackhole_transaction_hash: result.hash,
        blackhole_ledger_index: result.ledger_index,
        generated_master_key: null, // Remove from storage
      });

      LoggingService.info('Successfully blackholed master key', {
        requestId: creationRequest.id,
        transactionHash: result.hash,
      });
    } catch (error) {
      LoggingService.error('Failed to blackhole master key', {
        requestId: creationRequest.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add signers to the wallet
   */
  private async addSigners(creationRequest: WalletCreationRequest): Promise<void> {
    try {
      LoggingService.info('Adding signers to wallet', {
        requestId: creationRequest.id,
        address: creationRequest.generated_address,
      });

      if (!creationRequest.generated_address || !creationRequest.signer_configuration) {
        throw new Error('Wallet not ready for signer configuration');
      }

      const signerConfig = creationRequest.signer_configuration as SignerConfiguration;

      // Create wallet record
      const wallet = await Wallet.create({
        user_id: creationRequest.user_id,
        name: creationRequest.wallet_name,
        description: creationRequest.wallet_description || '',
        address: creationRequest.generated_address,
        network: creationRequest.network,
        signature_scheme: creationRequest.signature_scheme,
        quorum: creationRequest.quorum,
        is_imported: false,
        import_verified: true,
        status: 'active',
      });

      // Add signers
      for (const signerData of signerConfig.signers) {
        await ExternalSigner.create({
          wallet_id: wallet.id,
          public_address: signerData.public_address,
          weight: signerData.weight,
          nickname: signerData.nickname || '',
          added_by: creationRequest.user_id,
          is_active: true,
        });
      }

      // Setup multi-signature on XRPL
      await this.xrplService.setupMultiSignature(
        creationRequest.generated_address,
        signerConfig.signers.map(s => ({ address: s.public_address, weight: s.weight })),
        signerConfig.total_weight
      );

      // Update creation request
      await creationRequest.update({
        status: 'completed',
      });

      LoggingService.info('Successfully added signers', {
        requestId: creationRequest.id,
        walletId: wallet.id,
        signerCount: signerConfig.signers.length,
      });
    } catch (error) {
      LoggingService.error('Failed to add signers', {
        requestId: creationRequest.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Complete wallet setup
   */
  private async completeWalletSetup(creationRequest: WalletCreationRequest): Promise<void> {
    try {
      LoggingService.info('Completing wallet setup', {
        requestId: creationRequest.id,
      });

      // Update creation request
      await creationRequest.update({
        status: 'completed',
      });

      LoggingService.info('Successfully completed wallet setup', {
        requestId: creationRequest.id,
      });
    } catch (error) {
      LoggingService.error('Failed to complete wallet setup', {
        requestId: creationRequest.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verify wallet ownership through signature
   */
  private async verifyWalletOwnership(
    publicAddress: string,
    message: string,
    signature: string
  ): Promise<boolean> {
    try {
      // This would verify the signature using XRPL's verification methods
      // For now, we'll implement a basic verification
      const isValid = await this.xrplService.verifySignature(publicAddress, message, signature);
      return isValid;
    } catch (error) {
      LoggingService.error('Failed to verify wallet ownership', {
        publicAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate signer configuration
   */
  private validateSignerConfiguration(
    signers: Array<{ public_address: string; weight: number; nickname?: string }>,
    quorum: number
  ): SignerConfiguration {
    if (!signers || signers.length === 0) {
      throw new Error('At least one signer is required');
    }

    if (quorum <= 0) {
      throw new Error('Quorum must be greater than 0');
    }

    const totalWeight = signers.reduce((sum, signer) => sum + signer.weight, 0);

    if (quorum > totalWeight) {
      throw new Error('Quorum cannot exceed total signer weight');
    }

    // Check for duplicate addresses
    const addresses = signers.map(s => s.public_address);
    const uniqueAddresses = new Set(addresses);
    if (addresses.length !== uniqueAddresses.size) {
      throw new Error('Duplicate signer addresses are not allowed');
    }

    return {
      signers,
      total_weight: totalWeight,
    };
  }
} 