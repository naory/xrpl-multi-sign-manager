import { XRPLService } from './XRPLService';
import { LoggingService } from './LoggingService';
import { ExternalSigner } from '../models/ExternalSigner';
import Wallet from '../models/Wallet';
import { WalletImport } from '../models/WalletImport';
// Transaction and TransactionSignature models not yet implemented
// Using placeholder classes for now
class Transaction {
  static async create(_data: any): Promise<Transaction> {
    throw new Error('Transaction model not implemented yet');
  }
  static async findByPk(_id: string, _options?: any): Promise<Transaction | null> {
    throw new Error('Transaction model not implemented yet');
  }
  static async findAll(_options?: any): Promise<Transaction[]> {
    throw new Error('Transaction model not implemented yet');
  }
  static async update(_data: any, _options?: any): Promise<Transaction> {
    throw new Error('Transaction model not implemented yet');
  }
  id!: string;
  wallet_id!: string;
  transaction_type!: string;
  transaction_data!: any;
  status!: string;
  created_by!: string;
  signatures?: TransactionSignature[];
  required_weight!: number;
  xrpl_transaction!: any;
}

class TransactionSignature {
  static async create(_data: any): Promise<TransactionSignature> {
    throw new Error('TransactionSignature model not implemented yet');
  }
  static async findOne(_options?: any): Promise<TransactionSignature | null> {
    throw new Error('TransactionSignature model not implemented yet');
  }
  static async sum(_field: string, _options?: any): Promise<number> {
    throw new Error('TransactionSignature model not implemented yet');
  }
  id!: string;
  transaction_id!: string;
  signer_address!: string;
  signature!: string;
  weight!: number;
  public_key!: string;
}

export interface SignerInfo {
  public_address: string;
  weight: number;
  nickname?: string;
  email?: string;
  wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
}

export interface WalletImportRequest {
  address: string;
  name: string;
  description?: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  import_method: 'address' | 'qr_code' | 'manual';
  import_metadata?: Record<string, any>;
}

export interface TransactionProposal {
  wallet_id: string;
  transaction_type: 'Payment' | 'TrustSet' | 'OfferCreate' | 'OfferCancel';
  transaction_data: Record<string, any>;
  memo?: string;
  fee?: string;
}

export interface SignatureSubmission {
  transaction_id: string;
  signer_address: string;
  signature: string;
  public_key: string;
}

export class MultiSigCoordinatorService {
  private xrplService: XRPLService;

  constructor() {
    this.xrplService = new XRPLService();
  }

  /**
   * Import an existing multi-signature wallet
   */
  async importWallet(userId: string, importRequest: WalletImportRequest): Promise<Wallet> {
    try {
      LoggingService.info('Importing multi-sig wallet', {
        userId,
        address: importRequest.address,
        network: importRequest.network,
      });

      // Verify the wallet exists on XRPL and is a multi-sig wallet
      const accountInfo = await this.xrplService.getAccountInfo(importRequest.address);
      
      if (!accountInfo.SignerList) {
        throw new Error('Address is not a multi-signature wallet');
      }

      // Create wallet record
      const wallet = await Wallet.create({
        user_id: userId,
        name: importRequest.name,
        description: importRequest.description || undefined,
        address: importRequest.address,
        network: importRequest.network,
        signature_scheme: 'weighted', // Default to weighted for now
        quorum: accountInfo.SignerList.Quorum,
        is_imported: true,
        import_verified: true, // Verified since we confirmed it exists
        status: 'active'
      });

      // Create import record
      await WalletImport.create({
        wallet_id: wallet.id,
        imported_by: userId,
        import_method: importRequest.import_method,
        import_metadata: importRequest.import_metadata || undefined,
      });

      // Import existing signers from XRPL
      await this.importExistingSigners(wallet.id, accountInfo.SignerList.SignerEntries);

      LoggingService.info('Successfully imported multi-sig wallet', {
        walletId: wallet.id,
        address: wallet.address,
      });

      return wallet;
    } catch (error) {
      LoggingService.error('Failed to import multi-sig wallet', {
        userId,
        address: importRequest.address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Add a new signer to the multi-signature wallet
   */
  async addSigner(
    walletId: string,
    userId: string,
    signerInfo: SignerInfo
  ): Promise<ExternalSigner> {
    try {
      LoggingService.info('Adding signer to multi-sig wallet', {
        walletId,
        userId,
        signerAddress: signerInfo.public_address,
      });

      // Verify wallet exists and user has permission
      const wallet = await Wallet.findByPk(walletId);
      if (!wallet || wallet.user_id !== userId) {
        throw new Error('Wallet not found or access denied');
      }

      // Check if signer already exists
      const existingSigner = await ExternalSigner.findOne({
        where: {
          wallet_id: walletId,
          public_address: signerInfo.public_address,
        },
      });

      if (existingSigner) {
        throw new Error('Signer already exists for this wallet');
      }

      // Create external signer record
      const signer = await ExternalSigner.create({
        wallet_id: walletId,
        public_address: signerInfo.public_address,
        weight: signerInfo.weight,
        nickname: signerInfo.nickname || undefined,
        email: signerInfo.email || undefined,
        wallet_type: signerInfo.wallet_type || undefined,
        added_by: userId,
        is_active: true
      });

      // Update XRPL signer list
      await this.updateXRPLSignerList(wallet.address, signerInfo.public_address, signerInfo.weight, 'add');

      LoggingService.info('Successfully added signer to multi-sig wallet', {
        walletId,
        signerId: signer.id,
        signerAddress: signer.public_address,
      });

      return signer;
    } catch (error) {
      LoggingService.error('Failed to add signer to multi-sig wallet', {
        walletId,
        userId,
        signerAddress: signerInfo.public_address,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Remove a signer from the multi-signature wallet
   */
  async removeSigner(walletId: string, userId: string, signerAddress: string): Promise<void> {
    try {
      LoggingService.info('Removing signer from multi-sig wallet', {
        walletId,
        userId,
        signerAddress,
      });

      // Verify wallet exists and user has permission
      const wallet = await Wallet.findByPk(walletId);
      if (!wallet || wallet.user_id !== userId) {
        throw new Error('Wallet not found or access denied');
      }

      // Find and remove signer
      const signer = await ExternalSigner.findOne({
        where: {
          wallet_id: walletId,
          public_address: signerAddress,
        },
      });

      if (!signer) {
        throw new Error('Signer not found');
      }

      // Verify quorum can still be met
      const remainingSigners = await ExternalSigner.findAll({
        where: {
          wallet_id: walletId,
          is_active: true,
        },
      });

      const totalWeight = remainingSigners
        .filter(s => s.public_address !== signerAddress)
        .reduce((sum, s) => sum + s.weight, 0);

      if (totalWeight < wallet.quorum) {
        throw new Error('Cannot remove signer: quorum requirement would not be met');
      }

      // Update XRPL signer list
      await this.updateXRPLSignerList(wallet.address, signerAddress, signer.weight, 'remove');

      // Deactivate signer
      await signer.update({ is_active: false });

      LoggingService.info('Successfully removed signer from multi-sig wallet', {
        walletId,
        signerAddress,
      });
    } catch (error) {
      LoggingService.error('Failed to remove signer from multi-sig wallet', {
        walletId,
        userId,
        signerAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a transaction proposal
   */
  async createTransactionProposal(
    userId: string,
    proposal: TransactionProposal
  ): Promise<Transaction> {
    try {
      LoggingService.info('Creating transaction proposal', {
        userId,
        walletId: proposal.wallet_id,
        transactionType: proposal.transaction_type,
      });

      // Verify wallet exists and user has permission
      const wallet = await Wallet.findByPk(proposal.wallet_id);
      if (!wallet || wallet.user_id !== userId) {
        throw new Error('Wallet not found or access denied');
      }

      // Build XRPL transaction
      const xrplTransaction = await this.xrplService.buildTransaction(
        proposal.transaction_type,
        proposal.transaction_data,
        {
          fee: proposal.fee,
          memo: proposal.memo,
        }
      );

      // Create transaction record
      const transaction = await Transaction.create({
        wallet_id: proposal.wallet_id,
        transaction_type: proposal.transaction_type,
        transaction_data: proposal.transaction_data,
        xrpl_transaction: xrplTransaction,
        status: 'pending',
        required_weight: wallet.quorum,
        collected_weight: 0,
        created_by: userId,
      });

      LoggingService.info('Successfully created transaction proposal', {
        transactionId: transaction.id,
        walletId: proposal.wallet_id,
      });

      return transaction;
    } catch (error) {
      LoggingService.error('Failed to create transaction proposal', {
        userId,
        walletId: proposal.wallet_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Submit a signature for a transaction
   */
  async submitSignature(
    userId: string,
    signatureSubmission: SignatureSubmission
  ): Promise<TransactionSignature> {
    try {
      LoggingService.info('Submitting transaction signature', {
        userId,
        transactionId: signatureSubmission.transaction_id,
        signerAddress: signatureSubmission.signer_address,
      });

      // Verify transaction exists
      const transaction = await Transaction.findByPk(signatureSubmission.transaction_id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify signer is authorized for this wallet
      const signer = await ExternalSigner.findOne({
        where: {
          wallet_id: transaction.wallet_id,
          public_address: signatureSubmission.signer_address,
          is_active: true,
        },
      });

      if (!signer) {
        throw new Error('Signer not authorized for this wallet');
      }

      // Check if signature already exists
      const existingSignature = await TransactionSignature.findOne({
        where: {
          transaction_id: signatureSubmission.transaction_id,
          signer_address: signatureSubmission.signer_address,
        },
      });

      if (existingSignature) {
        throw new Error('Signature already submitted by this signer');
      }

      // Create signature record
      const signature = await TransactionSignature.create({
        transaction_id: signatureSubmission.transaction_id,
        signer_address: signatureSubmission.signer_address,
        signature: signatureSubmission.signature,
        public_key: signatureSubmission.public_key,
        weight: signer.weight,
        submitted_by: userId,
      });

      // Update collected weight
      const totalCollectedWeight = await TransactionSignature.sum('weight', {
        where: {
          transaction_id: signatureSubmission.transaction_id,
        },
      });

      await transaction.update({
        collected_weight: totalCollectedWeight || 0,
      });

      // Check if quorum is met
      if (totalCollectedWeight && totalCollectedWeight >= transaction.required_weight) {
        await this.submitTransactionToXRPL(transaction.id);
      }

      LoggingService.info('Successfully submitted transaction signature', {
        transactionId: signatureSubmission.transaction_id,
        signerAddress: signatureSubmission.signer_address,
        collectedWeight: totalCollectedWeight,
      });

      return signature;
    } catch (error) {
      LoggingService.error('Failed to submit transaction signature', {
        userId,
        transactionId: signatureSubmission.transaction_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get wallet details with signers
   */
  async getWalletDetails(walletId: string, userId: string): Promise<any> {
    try {
      const wallet = await Wallet.findByPk(walletId);
      if (!wallet || wallet.user_id !== userId) {
        throw new Error('Wallet not found or access denied');
      }

      const signers = await ExternalSigner.findAll({
        where: {
          wallet_id: walletId,
          is_active: true,
        },
        order: [['created_at', 'ASC']],
      });

      const balance = await this.xrplService.getBalance(wallet.address);

      return {
        ...wallet.toJSON(),
        signers: signers.map(signer => ({
          id: signer.id,
          public_address: signer.public_address,
          weight: signer.weight,
          nickname: signer.nickname,
          email: signer.email,
          wallet_type: signer.wallet_type,
          display_name: signer.displayName,
        })),
        balance,
        total_signers: signers.length,
        total_weight: signers.reduce((sum, s) => sum + s.weight, 0),
      };
    } catch (error) {
      LoggingService.error('Failed to get wallet details', {
        walletId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get pending transactions for a wallet
   */
  async getPendingTransactions(walletId: string, userId: string): Promise<Transaction[]> {
    try {
      const wallet = await Wallet.findByPk(walletId);
      if (!wallet || wallet.user_id !== userId) {
        throw new Error('Wallet not found or access denied');
      }

      return await Transaction.findAll({
        where: {
          wallet_id: walletId,
          status: 'pending',
        },
        include: [
          {
            model: TransactionSignature,
            as: 'signatures',
            attributes: ['signer_address', 'weight', 'created_at'],
          },
        ],
        order: [['created_at', 'DESC']],
      });
    } catch (error) {
      LoggingService.error('Failed to get pending transactions', {
        walletId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Import existing signers from XRPL
   */
  private async importExistingSigners(
    walletId: string,
    signerEntries: any[]
  ): Promise<void> {
    for (const entry of signerEntries) {
      await ExternalSigner.create({
        wallet_id: walletId,
        public_address: entry.SignerEntry.Account,
        weight: entry.SignerEntry.SignerWeight,
        nickname: `Imported Signer ${entry.SignerEntry.Account.slice(0, 8)}`,
        added_by: '', // Will be updated when we know the importer
      });
    }
  }

  /**
   * Update XRPL signer list
   */
  private async updateXRPLSignerList(
    walletAddress: string,
    signerAddress: string,
    weight: number,
    action: 'add' | 'remove'
  ): Promise<void> {
    // This would interact with XRPL to update the signer list
    // Implementation depends on how we handle XRPL transactions
    LoggingService.info('Updating XRPL signer list', {
      walletAddress,
      signerAddress,
      weight,
      action,
    });
  }

  /**
   * Submit transaction to XRPL when quorum is met
   */
  private async submitTransactionToXRPL(transactionId: string): Promise<void> {
    try {
      const transaction = await Transaction.findByPk(transactionId, {
        include: [
          {
            model: TransactionSignature,
            as: 'signatures',
          },
        ],
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Combine signatures and submit to XRPL
      const result = await this.xrplService.submitMultiSignedTransaction(
        transaction.xrpl_transaction,
        transaction.signatures.map(sig => ({
          signature: sig.signature,
          public_key: sig.public_key,
        }))
      );

      // Update transaction status
      await transaction.update({
        status: 'submitted',
        xrpl_hash: result.hash,
        ledger_index: result.ledger_index,
      });

      LoggingService.info('Successfully submitted transaction to XRPL', {
        transactionId,
        hash: result.hash,
      });
    } catch (error) {
      LoggingService.error('Failed to submit transaction to XRPL', {
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
} 