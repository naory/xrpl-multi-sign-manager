import { Client, Wallet, AccountTxResponse, AccountInfoResponse } from 'xrpl';
import { LoggingService } from './LoggingService';

interface XRPLConfig {
  primaryNode: string;
  backupNodes: string[];
  connectionTimeout: number;
  retryAttempts: number;
  network: 'mainnet' | 'testnet' | 'devnet';
}

interface WalletResult {
  address: string;
  publicKey: string;
  privateKey: string;
  seed: string;
  balance?: string;
}

interface MultiSignatureResult {
  success: boolean;
  transactionHash: string;
  signerList: any;
  quorum: number;
  signerEntries: Array<{ address: string; weight: number }>;
}

interface TransactionResult {
  success: boolean;
  transactionHash: string;
  ledgerIndex: number;
  fee: string;
  validated: boolean;
}

interface BalanceResult {
  address: string;
  xrpBalance: string;
  tokenBalances: Array<{
    currency: string;
    currencyHex?: string;
    value: string;
    issuer?: string;
  }>;
  lastUpdated: Date;
}



export class XRPLService {
  private client: Client;
  private config: XRPLConfig;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;

  constructor() {
    this.config = {
      primaryNode: process.env['XRPL_PRIMARY_NODE'] || 'wss://s.altnet.rippletest.net:51233',
      backupNodes: process.env['XRPL_BACKUP_NODES']?.split(',') || [
        'wss://testnet.xrpl-labs.com',
        'wss://s.altnet.rippletest.net:51233'
      ],
      connectionTimeout: 30000,
      retryAttempts: 3,
      network: (process.env['XRPL_NETWORK'] as 'mainnet' | 'testnet' | 'devnet') || 'testnet'
    };
    
    this.client = new Client(this.config.primaryNode);
  }

  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      await this.client.connect();
      this.isConnected = true;
      this.connectionRetries = 0;
      
      LoggingService.info('XRPL Service connected', {
        node: this.config.primaryNode,
        network: this.config.network
      });
    } catch (error) {
      this.connectionRetries++;
      LoggingService.error('Failed to connect to XRPL node', {
        node: this.config.primaryNode,
        attempt: this.connectionRetries,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (this.connectionRetries < this.config.retryAttempts) {
        await this.tryBackupNodes();
      } else {
        throw new Error(`Failed to connect to XRPL after ${this.config.retryAttempts} attempts`);
      }
    }
  }

  private async tryBackupNodes(): Promise<void> {
    for (const backupNode of this.config.backupNodes) {
      try {
        LoggingService.info('Trying backup XRPL node', { node: backupNode });
        
        this.client = new Client(backupNode, {
          connectionTimeout: this.config.connectionTimeout
        });
        
        await this.client.connect();
        this.isConnected = true;
        this.connectionRetries = 0;
        
        LoggingService.info('Connected to backup XRPL node', { node: backupNode });
        return;
      } catch (error) {
        LoggingService.warn('Failed to connect to backup node', {
          node: backupNode,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    throw new Error('All XRPL nodes failed to connect');
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
      LoggingService.info('XRPL Service disconnected');
    }
  }

  async createWallet(): Promise<WalletResult> {
    try {
      await this.ensureConnection();
      
      const wallet = Wallet.generate();
      
      // Fund the wallet (for testnet/devnet)
      if (this.config.network !== 'mainnet') {
        await this.fundWallet(wallet.address);
      }

      const balance = await this.getBalance(wallet.address);

      LoggingService.info('Wallet created successfully', {
        address: wallet.address,
        network: this.config.network
      });

      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        seed: wallet.seed || '',
        balance: balance.xrpBalance
      };
    } catch (error) {
      LoggingService.error('Failed to create wallet', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async setupMultiSignature(
    masterWallet: Wallet,
    signers: Array<{ address: string; weight: number }>,
    quorum: number
  ): Promise<MultiSignatureResult> {
    try {
      await this.ensureConnection();

      // Validate inputs
      if (signers.length === 0) {
        throw new Error('At least one signer is required');
      }

      if (quorum <= 0) {
        throw new Error('Quorum must be greater than 0');
      }

      const totalWeight = signers.reduce((sum, signer) => sum + signer.weight, 0);
      if (quorum > totalWeight) {
        throw new Error('Quorum cannot exceed total signer weight');
      }

      const signerList = {
        SignerEntries: signers.map((signer) => ({
          SignerEntry: {
            Account: signer.address,
            SignerWeight: signer.weight
          }
        })),
        SignerQuorum: quorum
      };

      const transaction = {
        TransactionType: 'SignerListSet',
        Account: masterWallet.address,
        SignerList: signerList
      };

      const prepared = await this.client.autofill(transaction as any);
      const signed = masterWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      if ((result.result.meta as any)?.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${(result.result.meta as any)?.TransactionResult}`);
      }

      LoggingService.info('Multi-signature setup successful', {
        masterAddress: masterWallet.address,
        signerCount: signers.length,
        quorum,
        transactionHash: result.result.hash
      });

      return {
        success: true,
        transactionHash: result.result.hash,
        signerList: signerList,
        quorum,
        signerEntries: signers
      };
    } catch (error) {
      LoggingService.error('Failed to setup multi-signature', {
        masterAddress: masterWallet.address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async submitTransaction(
    transaction: any,
    signers: Wallet[]
  ): Promise<TransactionResult> {
    try {
      await this.ensureConnection();

      if (signers.length === 0) {
        throw new Error('At least one signer is required');
      }

      // Prepare the transaction
      const prepared = await this.client.autofill(transaction as any);

      // Sign with all signers
      let signed = prepared;
      for (const signer of signers) {
        signed = signer.sign(signed);
      }

      // Submit and wait for validation
      const result = await this.client.submitAndWait(signed.tx_blob);

      if ((result.result.meta as any)?.TransactionResult !== 'tesSUCCESS') {
        throw new Error(`Transaction failed: ${(result.result.meta as any)?.TransactionResult}`);
      }

      LoggingService.info('Transaction submitted successfully', {
        transactionHash: result.result.hash,
        ledgerIndex: result.result.ledger_index,
        fee: result.result.Fee
      });

      return {
        success: true,
        transactionHash: result.result.hash,
        ledgerIndex: result.result.ledger_index,
        fee: result.result.Fee,
        validated: true
      };
    } catch (error) {
      LoggingService.error('Failed to submit transaction', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getBalance(address: string): Promise<BalanceResult> {
    try {
      await this.ensureConnection();

      const accountInfo = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      }) as AccountInfoResponse;

      const balance = accountInfo.result.account_data.Balance;
      const xrpBalance = this.xrpToDrops(balance);

      // Get token balances
      const tokenBalances: Array<{
        currency: string;
        currencyHex?: string;
        value: string;
        issuer?: string;
      }> = [];

      if ((accountInfo.result.account_data as any).Lines) {
        for (const line of (accountInfo.result.account_data as any).Lines) {
          const currency = this.hexToCurrencyCode(line.currency);
          tokenBalances.push({
            currency,
            currencyHex: line.currency,
            value: line.balance,
            issuer: line.account
          });
        }
      }

      return {
        address,
        xrpBalance,
        tokenBalances,
        lastUpdated: new Date()
      };
    } catch (error) {
      LoggingService.error('Failed to get balance', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getTransactionHistory(address: string, limit: number = 20): Promise<any[]> {
    try {
      await this.ensureConnection();

      const response = await this.client.request({
        command: 'account_tx',
        account: address,
        limit,
        ledger_index_min: -1,
        ledger_index_max: -1
      }) as AccountTxResponse;

      return response.result.transactions.map(tx => ({
        hash: tx.tx?.hash || '',
        ledgerIndex: tx.tx?.ledger_index || 0,
        date: new Date((tx.tx?.date || 0) * 1000),
        transactionType: tx.tx?.TransactionType || '',
        fee: tx.tx?.Fee || '',
        validated: tx.validated
      }));
    } catch (error) {
      LoggingService.error('Failed to get transaction history', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getAccountInfo(address: string): Promise<any> {
    try {
      await this.ensureConnection();

      const response = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      }) as AccountInfoResponse;

      return {
        address: response.result.account_data.Account,
        balance: this.xrpToDrops(response.result.account_data.Balance),
        sequence: response.result.account_data.Sequence,
        flags: response.result.account_data.Flags,
        ownerCount: response.result.account_data.OwnerCount,
        ledgerCurrentIndex: response.result.ledger_current_index
      };
    } catch (error) {
      LoggingService.error('Failed to get account info', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Currency management methods
  hexToCurrencyCode(hex: string): string {
    if (hex === '0000000000000000000000000000000000000000') {
      return 'XRP';
    }

    // Remove null bytes and convert to string
    const currency = Buffer.from(hex, 'hex')
      .toString('utf8')
      .replace(/\0/g, '');

    return currency || hex;
  }

  currencyCodeToHex(currency: string): string {
    if (currency === 'XRP') {
      return '0000000000000000000000000000000000000000';
    }

    // Convert to hex and pad to 40 characters
    const hex = Buffer.from(currency, 'utf8').toString('hex');
    return hex.padEnd(40, '0');
  }

  // Utility methods
  private xrpToDrops(xrp: string): string {
    return (parseInt(xrp) * 1000000).toString();
  }



  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private async fundWallet(address: string): Promise<void> {
    try {
      // Use XRPL testnet faucet
      const response = await fetch('https://faucet.altnet.rippletest.net/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destination: address
        })
      });

      if (!response.ok) {
        throw new Error(`Faucet request failed: ${response.statusText}`);
      }

      const result = await response.json();
      LoggingService.info('Wallet funded successfully', {
        address,
        amount: result.amount
      });
    } catch (error) {
      LoggingService.warn('Failed to fund wallet', {
        address,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error for funding failure in development
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      await this.ensureConnection();
      
      const serverInfo = await this.client.request({
        command: 'server_info'
      });

      return {
        status: 'connected',
        details: {
          node: this.config.primaryNode,
          network: this.config.network,
          serverTime: serverInfo.result.info.time,
          validatedLedger: serverInfo.result.info.validated_ledger
        }
      };
    } catch (error) {
      return {
        status: 'disconnected',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
} 