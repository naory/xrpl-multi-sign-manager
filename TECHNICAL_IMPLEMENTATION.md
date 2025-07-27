# XRPL Multi-Sign Manager - Technical Implementation Guide

## Overview

This document provides detailed technical implementation guidance, code examples, and best practices for building the XRPL Multi-Sign Manager. It covers the core components, architecture patterns, and implementation strategies.

## Project Structure

```
xrpl-multi-sign-manager/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   ├── tests/
│   ├── migrations/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   └── types/
│   ├── public/
│   └── package.json
├── shared/
│   ├── types/
│   └── constants/
├── docker/
├── docs/
└── scripts/
```

## Backend Implementation

### Complete Database Schema Implementation

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    kyc_status VARCHAR(50) DEFAULT 'pending',
    kyc_verified_at TIMESTAMP,
    kyc_document_hash VARCHAR(255),
    aml_status VARCHAR(50) DEFAULT 'pending',
    ofac_status VARCHAR(50) DEFAULT 'pending',
    risk_score INTEGER DEFAULT 0,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master Keys table (for wallet master keys)
CREATE TABLE master_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID, -- Will reference wallets(id) after creation
    key_type VARCHAR(50) NOT NULL, -- 'ed25519', 'secp256k1'
    public_key VARCHAR(255) NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    key_derivation_path VARCHAR(255),
    backup_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signing Keys table (for individual signer keys)
CREATE TABLE signing_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    key_type VARCHAR(50) NOT NULL, -- 'ed25519', 'secp256k1'
    public_key VARCHAR(255) NOT NULL,
    encrypted_private_key TEXT NOT NULL,
    key_derivation_path VARCHAR(255),
    backup_status VARCHAR(50) DEFAULT 'pending',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    xrpl_address VARCHAR(255) UNIQUE NOT NULL,
    master_key_id UUID REFERENCES master_keys(id),
    signature_scheme VARCHAR(50) NOT NULL, -- '2-of-3', '3-of-5', 'weighted'
    required_signatures INTEGER NOT NULL,
    total_signers INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    balance_xrp DECIMAL(20,6) DEFAULT 0,
    balance_usd DECIMAL(20,2) DEFAULT 0,
    last_balance_update TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint after both tables exist
ALTER TABLE master_keys ADD CONSTRAINT fk_master_keys_wallet 
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;

-- Wallet Signers table
CREATE TABLE wallet_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    signing_key_id UUID REFERENCES signing_keys(id),
    role VARCHAR(50) NOT NULL, -- 'owner', 'signer', 'viewer'
    weight INTEGER DEFAULT 1 NOT NULL, -- XRPL signer weight
    permissions JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_id, user_id)
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    access_token_hash VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    initiator_id UUID REFERENCES users(id),
    xrpl_tx_hash VARCHAR(255) UNIQUE,
    transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'trust_set', 'offer_create', etc.
    destination_address VARCHAR(255),
    amount DECIMAL(20,6),
    currency VARCHAR(50) DEFAULT 'XRP', -- Human-readable currency code
    currency_hex VARCHAR(40), -- XRPL hex currency code for tokens
    fee DECIMAL(20,6),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'executed', 'failed'
    required_signatures INTEGER NOT NULL,
    collected_signatures INTEGER DEFAULT 0,
    required_weight INTEGER NOT NULL, -- Total weight required for approval
    collected_weight INTEGER DEFAULT 0, -- Total weight of collected signatures
    transaction_data JSONB NOT NULL,
    executed_at TIMESTAMP,
    ledger_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Signatures table
CREATE TABLE transaction_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES users(id),
    signing_key_id UUID REFERENCES signing_keys(id),
    signature_data TEXT NOT NULL,
    signature_type VARCHAR(50) DEFAULT 'approval', -- 'approval', 'rejection'
    weight INTEGER DEFAULT 1 NOT NULL, -- Weight of this signature
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table (Enhanced)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES sessions(id),
    request_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'wallet', 'transaction', 'user', 'key'
    resource_id UUID,
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    response_status INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rate Limits table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- IP, user_id, or combination
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identifier, endpoint, window_start)
);

-- Security Events table
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL, -- 'failed_login', 'suspicious_activity', 'mfa_bypass_attempt'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    details JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Failed Login Attempts table
CREATE TABLE failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Backups table
CREATE TABLE wallet_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'keys_only', 'configuration'
    encrypted_backup_data TEXT NOT NULL,
    backup_hash VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recovery Requests table
CREATE TABLE recovery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    wallet_id UUID REFERENCES wallets(id),
    recovery_type VARCHAR(50) NOT NULL, -- 'key_recovery', 'wallet_recovery', 'access_recovery'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'completed'
    required_approvals INTEGER NOT NULL,
    collected_approvals INTEGER DEFAULT 0,
    request_data JSONB NOT NULL,
    approved_by JSONB, -- Array of user IDs who approved
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Currency Mappings table (for hex to human-readable conversion)
CREATE TABLE currency_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code VARCHAR(10) NOT NULL UNIQUE, -- Human-readable (e.g., 'USD')
    currency_hex VARCHAR(40) NOT NULL UNIQUE, -- XRPL hex code
    issuer_address VARCHAR(255), -- For issued tokens
    currency_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_wallets_address ON wallets(xrpl_address);
CREATE INDEX idx_wallets_status ON wallets(status);
CREATE INDEX idx_wallet_signers_wallet_user ON wallet_signers(wallet_id, user_id);
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_active);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_transactions_wallet_status ON transactions(wallet_id, status);
CREATE INDEX idx_transactions_hash ON transactions(xrpl_tx_hash);
CREATE INDEX idx_transaction_signatures_transaction ON transaction_signatures(transaction_id);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier, endpoint);
CREATE INDEX idx_security_events_user_severity ON security_events(user_id, severity);
CREATE INDEX idx_failed_login_email_ip ON failed_login_attempts(email, ip_address);
CREATE INDEX idx_currency_mappings_hex ON currency_mappings(currency_hex);
CREATE INDEX idx_currency_mappings_code ON currency_mappings(currency_code);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_keys_updated_at BEFORE UPDATE ON master_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_signing_keys_updated_at BEFORE UPDATE ON signing_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_signers_updated_at BEFORE UPDATE ON wallet_signers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_logs_updated_at BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_limits_updated_at BEFORE UPDATE ON rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recovery_requests_updated_at BEFORE UPDATE ON recovery_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_currency_mappings_updated_at BEFORE UPDATE ON currency_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Authentication Service

```typescript
// src/services/AuthService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthConfig } from '../config/auth';

export class AuthService {
  private readonly saltRounds = 12;
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
    this.jwtExpiry = process.env.JWT_EXPIRY || '15m';
  }

  async registerUser(userData: RegisterUserData): Promise<User> {
    const { email, password, firstName, lastName, phone } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Create user
    const user = await User.create({
      email,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone,
      status: 'active'
    });

    return user;
  }

  async loginUser(email: string, password: string, mfaCode?: string): Promise<LoginResult> {
    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Verify MFA if enabled
    if (user.mfa_enabled) {
      if (!mfaCode) {
        throw new Error('MFA code required');
      }
      const isValidMFA = this.verifyMFA(user.mfa_secret, mfaCode);
      if (!isValidMFA) {
        throw new Error('Invalid MFA code');
      }
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
      expiresIn: 900 // 15 minutes
    };
  }

  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry }
    );
  }

  private generateRefreshToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  private verifyMFA(secret: string, code: string): boolean {
    // Implement TOTP verification
    const totp = require('totp-generator');
    const expectedCode = totp(secret);
    return code === expectedCode;
  }

  private sanitizeUser(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      mfaEnabled: user.mfa_enabled,
      status: user.status
    };
  }
}
```

### XRPL Integration Service

```typescript
// src/services/XRPLService.ts
import { Client, Wallet, xrpl } from 'xrpl';
import { XRPLConfig } from '../config/xrpl';

export class XRPLService {
  private client: Client;
  private config: XRPLConfig;

  constructor() {
    this.config = {
      primaryNode: process.env.XRPL_PRIMARY_NODE || 'wss://xrplcluster.com',
      backupNodes: process.env.XRPL_BACKUP_NODES?.split(',') || [],
      connectionTimeout: 30000,
      retryAttempts: 3
    };
    this.client = new Client(this.config.primaryNode);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('Connected to XRPL node');
    } catch (error) {
      console.error('Failed to connect to XRPL node:', error);
      throw error;
    }
  }

  async createWallet(): Promise<WalletResult> {
    try {
      const wallet = Wallet.generate();
      
      // Fund the wallet (for testnet)
      if (process.env.NODE_ENV === 'development') {
        await this.fundWallet(wallet.address);
      }

      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        seed: wallet.seed
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      throw error;
    }
  }

  async setupMultiSignature(
    masterWallet: Wallet,
    signers: Array<{ address: string; weight: number }>,
    quorum: number
  ): Promise<MultiSignatureResult> {
    try {
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

      const prepared = await this.client.autofill(transaction);
      const signed = masterWallet.sign(prepared);
      const result = await this.client.submitAndWait(signed.tx_blob);

      return {
        success: true,
        transactionHash: result.result.hash,
        signerList: signerList
      };
    } catch (error) {
      console.error('Failed to setup multi-signature:', error);
      throw error;
    }
  }

  async submitTransaction(
    transaction: any,
    signers: Wallet[]
  ): Promise<TransactionResult> {
    try {
      // Prepare transaction
      const prepared = await this.client.autofill(transaction);
      
      // Collect signatures
      const signatures = [];
      for (const signer of signers) {
        const signed = signer.sign(prepared);
        signatures.push(signed);
      }

      // Combine signatures
      const multiSigned = xrpl.multisign(signatures);
      
      // Submit transaction
      const result = await this.client.submitAndWait(multiSigned);

      return {
        success: true,
        transactionHash: result.result.hash,
        ledgerIndex: result.result.ledger_index
      };
    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    try {
      const accountInfo = await this.client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });

      return {
        address: address,
        balance: accountInfo.result.account_data.Balance,
        sequence: accountInfo.result.account_data.Sequence,
        flags: accountInfo.result.account_data.Flags
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  private async fundWallet(address: string): Promise<void> {
    try {
      const fundResponse = await this.client.fundWallet();
      console.log(`Funded wallet ${address} with ${fundResponse.balance} XRP`);
    } catch (error) {
      console.error('Failed to fund wallet:', error);
      throw error;
    }
  }
}

### Currency Management Service

```typescript
// src/services/CurrencyService.ts
import { CurrencyMapping } from '../models/CurrencyMapping';

export class CurrencyService {
  private static readonly XRP_HEX = '0000000000000000000000000000000000000000';
  private static readonly XRP_CODE = 'XRP';

  /**
   * Convert XRPL hex currency code to human-readable format
   */
  async hexToCurrencyCode(hexCode: string): Promise<string> {
    if (hexCode === this.XRP_HEX) {
      return this.XRP_CODE;
    }

    const mapping = await CurrencyMapping.findOne({
      where: { currency_hex: hexCode, is_active: true }
    });

    if (mapping) {
      return mapping.currency_code;
    }

    // If no mapping found, return hex code as fallback
    return hexCode;
  }

  /**
   * Convert human-readable currency code to XRPL hex format
   */
  async currencyCodeToHex(currencyCode: string): Promise<string> {
    if (currencyCode === this.XRP_CODE) {
      return this.XRP_HEX;
    }

    const mapping = await CurrencyMapping.findOne({
      where: { currency_code: currencyCode, is_active: true }
    });

    if (mapping) {
      return mapping.currency_hex;
    }

    // If no mapping found, assume it's already a hex code
    return currencyCode;
  }

  /**
   * Get currency details including issuer information
   */
  async getCurrencyDetails(currencyCode: string): Promise<CurrencyDetails | null> {
    const mapping = await CurrencyMapping.findOne({
      where: { currency_code: currencyCode, is_active: true }
    });

    if (!mapping) {
      return null;
    }

    return {
      code: mapping.currency_code,
      hex: mapping.currency_hex,
      name: mapping.currency_name,
      issuer: mapping.issuer_address,
      isXRP: currencyCode === this.XRP_CODE
    };
  }

  /**
   * Initialize common currency mappings
   */
  async initializeCurrencyMappings(): Promise<void> {
    const commonCurrencies = [
      { code: 'USD', hex: '0000000000000000000000005553440000000000', name: 'US Dollar', issuer: null },
      { code: 'EUR', hex: '0000000000000000000000004555520000000000', name: 'Euro', issuer: null },
      { code: 'GBP', hex: '0000000000000000000000004742500000000000', name: 'British Pound', issuer: null },
      { code: 'JPY', hex: '0000000000000000000000004A50590000000000', name: 'Japanese Yen', issuer: null },
      { code: 'CNY', hex: '000000000000000000000000434E590000000000', name: 'Chinese Yuan', issuer: null }
    ];

    for (const currency of commonCurrencies) {
      await CurrencyMapping.findOrCreate({
        where: { currency_code: currency.code },
        defaults: {
          currency_hex: currency.hex,
          currency_name: currency.name,
          issuer_address: currency.issuer,
          is_active: true
        }
      });
    }
  }
}

interface CurrencyDetails {
  code: string;
  hex: string;
  name: string;
  issuer: string | null;
  isXRP: boolean;
}
```
```

### Wallet Management Service

```typescript
// src/services/WalletService.ts
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { XRPLService } from './XRPLService';
import { KeyManagementService } from './KeyManagementService';

export class WalletService {
  private xrplService: XRPLService;
  private keyManagementService: KeyManagementService;

  constructor() {
    this.xrplService = new XRPLService();
    this.keyManagementService = new KeyManagementService();
  }

  async createWallet(
    userId: string,
    walletData: CreateWalletData
  ): Promise<Wallet> {
    const { name, description, signatureScheme, signers } = walletData;

    // Parse signature scheme
    const [required, total] = signatureScheme.split('-of-').map(Number);
    
    // Create XRPL wallet
    const xrplWallet = await this.xrplService.createWallet();
    
    // Generate and encrypt keys
    const masterKey = await this.keyManagementService.generateMasterKey();
    const signingKeys = await this.keyManagementService.generateSigningKeys(total);
    
    // Create wallet record
    const wallet = await Wallet.create({
      name,
      description,
      xrpl_address: xrplWallet.address,
      master_key_id: masterKey.id,
      signature_scheme: signatureScheme,
      required_signatures: required,
      total_signers: total,
      status: 'active'
    });

    // Setup multi-signature on XRPL with weights
    const signerEntries = signingKeys.map((key, index) => ({
      address: key.xrplAddress,
      weight: 1 // Default weight, can be customized per signer
    }));
    await this.xrplService.setupMultiSignature(
      xrplWallet,
      signerEntries,
      required
    );

    // Associate signers with wallet
    await this.associateSigners(wallet.id, signers, signingKeys);

    return wallet;
  }

  async getWallets(userId: string): Promise<WalletSummary[]> {
    const wallets = await Wallet.findAll({
      include: [{
        model: User,
        as: 'signers',
        where: { id: userId },
        attributes: ['id', 'first_name', 'last_name', 'email']
      }],
      attributes: [
        'id', 'name', 'xrpl_address', 'signature_scheme',
        'status', 'balance_xrp', 'balance_usd', 'created_at'
      ]
    });

    return wallets.map(wallet => ({
      id: wallet.id,
      name: wallet.name,
      xrplAddress: wallet.xrpl_address,
      signatureScheme: wallet.signature_scheme,
      status: wallet.status,
      balanceXRP: wallet.balance_xrp,
      balanceUSD: wallet.balance_usd,
      lastActivity: wallet.updated_at
    }));
  }

  async getWalletDetails(walletId: string, userId: string): Promise<WalletDetails> {
    const wallet = await Wallet.findOne({
      where: { id: walletId },
      include: [{
        model: User,
        as: 'signers',
        attributes: ['id', 'first_name', 'last_name', 'email', 'status']
      }]
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check user permissions
    const userSigner = wallet.signers.find(signer => signer.id === userId);
    if (!userSigner) {
      throw new Error('Access denied');
    }

    // Get XRPL account info
    const accountInfo = await this.xrplService.getAccountInfo(wallet.xrpl_address);

    return {
      id: wallet.id,
      name: wallet.name,
      description: wallet.description,
      xrplAddress: wallet.xrpl_address,
      signatureScheme: wallet.signature_scheme,
      requiredSignatures: wallet.required_signatures,
      totalSigners: wallet.total_signers,
      status: wallet.status,
      balanceXRP: accountInfo.balance,
      balanceUSD: wallet.balance_usd,
      signers: wallet.signers.map(signer => ({
        userId: signer.id,
        userName: `${signer.first_name} ${signer.last_name}`,
        role: signer.role,
        status: signer.status,
        lastActive: signer.updated_at
      })),
      recentTransactions: await this.getRecentTransactions(walletId)
    };
  }

  private async associateSigners(
    walletId: string,
    signers: SignerData[],
    signingKeys: SigningKey[]
  ): Promise<void> {
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const signingKey = signingKeys[i];

      await WalletSigner.create({
        wallet_id: walletId,
        user_id: signer.userId,
        signing_key_id: signingKey.id,
        role: signer.role,
        permissions: signer.permissions || {}
      });
    }
  }

  private async getRecentTransactions(walletId: string): Promise<TransactionSummary[]> {
    // Implementation for getting recent transactions
    return [];
  }
}
```

## Frontend Implementation

### Component Library

```typescript
// src/components/ui/Button.tsx
import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
```

### Wallet Management Components

```typescript
// src/components/wallet/WalletCard.tsx
import React from 'react';
import { WalletSummary } from '../../types/wallet';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatCurrency, formatAddress } from '../../utils/formatters';

interface WalletCardProps {
  wallet: WalletSummary;
  onView: (walletId: string) => void;
  onSend: (walletId: string) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onView,
  onSend
}) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{wallet.name}</h3>
          <p className="text-sm text-gray-500">{formatAddress(wallet.xrplAddress)}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          wallet.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {wallet.status}
        </span>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Balance (XRP)</span>
          <span className="font-medium">{wallet.balanceXRP.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Balance (USD)</span>
          <span className="font-medium">{formatCurrency(wallet.balanceUSD)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Signature Scheme</span>
          <span className="font-medium">{wallet.signatureScheme}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onView(wallet.id)}
          className="flex-1"
        >
          View Details
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSend(wallet.id)}
          className="flex-1"
        >
          Send
        </Button>
      </div>
    </Card>
  );
};
```

### Transaction Creation Form

```typescript
// src/components/transaction/CreateTransactionForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useTransactionService } from '../../hooks/useTransactionService';

interface CreateTransactionFormProps {
  walletId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface TransactionFormData {
  transactionType: 'payment' | 'trust_set' | 'offer_create';
  destinationAddress?: string;
  amount: number;
  currency: string;
  memo?: string;
}

export const CreateTransactionForm: React.FC<CreateTransactionFormProps> = ({
  walletId,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const { createTransaction } = useTransactionService();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<TransactionFormData>();

  const transactionType = watch('transactionType');

  const onSubmit = async (data: TransactionFormData) => {
    setLoading(true);
    try {
      await createTransaction(walletId, {
        transactionType: data.transactionType,
        destinationAddress: data.destinationAddress,
        amount: data.amount,
        currency: data.currency,
        memo: data.memo,
        transactionData: {}
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <Select
          {...register('transactionType', { required: 'Transaction type is required' })}
          error={errors.transactionType?.message}
        >
          <option value="">Select transaction type</option>
          <option value="payment">Payment</option>
          <option value="trust_set">Trust Set</option>
          <option value="offer_create">Create Offer</option>
        </Select>
      </div>

      {transactionType === 'payment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Destination Address
          </label>
          <Input
            {...register('destinationAddress', {
              required: 'Destination address is required',
              pattern: {
                value: /^r[a-zA-Z0-9]{25,34}$/,
                message: 'Invalid XRPL address format'
              }
            })}
            placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            error={errors.destinationAddress?.message}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <Input
            type="number"
            step="0.000001"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0.000001, message: 'Amount must be greater than 0' }
            })}
            error={errors.amount?.message}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <Select
            {...register('currency', { required: 'Currency is required' })}
            error={errors.currency?.message}
          >
            <option value="XRP">XRP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Memo (Optional)
        </label>
        <Textarea
          {...register('memo')}
          placeholder="Add a memo to this transaction"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          Create Transaction
        </Button>
      </div>
    </form>
  );
};
```

## API Implementation

### Express.js Server Setup

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { routes } from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', routes.auth);
app.use('/api/wallets', authMiddleware, routes.wallets);
app.use('/api/transactions', authMiddleware, routes.transactions);
app.use('/api/users', authMiddleware, routes.users);

// Error handling
app.use(errorHandler);

export default app;
```

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### Wallet Controller

```typescript
// src/controllers/WalletController.ts
import { Request, Response } from 'express';
import { WalletService } from '../services/WalletService';
import { validateCreateWallet } from '../validators/walletValidator';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: Request, res: Response) {
    try {
      const { error, value } = validateCreateWallet(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const wallet = await this.walletService.createWallet(
        req.user!.id,
        value
      );

      res.status(201).json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Create wallet error:', error);
      res.status(500).json({
        error: 'Failed to create wallet'
      });
    }
  }

  async getWallets(req: Request, res: Response) {
    try {
      const wallets = await this.walletService.getWallets(req.user!.id);
      
      res.json({
        success: true,
        data: wallets
      });
    } catch (error) {
      console.error('Get wallets error:', error);
      res.status(500).json({
        error: 'Failed to retrieve wallets'
      });
    }
  }

  async getWallet(req: Request, res: Response) {
    try {
      const { walletId } = req.params;
      const wallet = await this.walletService.getWalletDetails(
        walletId,
        req.user!.id
      );

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      if (error.message === 'Wallet not found') {
        return res.status(404).json({ error: 'Wallet not found' });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.status(500).json({
        error: 'Failed to retrieve wallet'
      });
    }
  }
}
```

## Testing Implementation

### Unit Tests

```typescript
// tests/services/WalletService.test.ts
import { WalletService } from '../../src/services/WalletService';
import { XRPLService } from '../../src/services/XRPLService';
import { KeyManagementService } from '../../src/services/KeyManagementService';

jest.mock('../../src/services/XRPLService');
jest.mock('../../src/services/KeyManagementService');

describe('WalletService', () => {
  let walletService: WalletService;
  let mockXRPLService: jest.Mocked<XRPLService>;
  let mockKeyManagementService: jest.Mocked<KeyManagementService>;

  beforeEach(() => {
    mockXRPLService = new XRPLService() as jest.Mocked<XRPLService>;
    mockKeyManagementService = new KeyManagementService() as jest.Mocked<KeyManagementService>;
    walletService = new WalletService();
  });

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      const userId = 'user-123';
      const walletData = {
        name: 'Test Wallet',
        description: 'Test wallet description',
        signatureScheme: '2-of-3',
        signers: [
          { userId: 'signer-1', role: 'owner' },
          { userId: 'signer-2', role: 'signer' },
          { userId: 'signer-3', role: 'signer' }
        ]
      };

      mockXRPLService.createWallet.mockResolvedValue({
        address: 'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        publicKey: 'public-key',
        privateKey: 'private-key',
        seed: 'seed'
      });

      mockKeyManagementService.generateMasterKey.mockResolvedValue({
        id: 'master-key-1',
        encryptedKey: 'encrypted-master-key'
      });

      mockKeyManagementService.generateSigningKeys.mockResolvedValue([
        { id: 'key-1', xrplAddress: 'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
        { id: 'key-2', xrplAddress: 'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' },
        { id: 'key-3', xrplAddress: 'rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' }
      ]);

      const result = await walletService.createWallet(userId, walletData);

      expect(result).toBeDefined();
      expect(result.name).toBe(walletData.name);
      expect(result.signature_scheme).toBe(walletData.signatureScheme);
      expect(mockXRPLService.createWallet).toHaveBeenCalled();
      expect(mockKeyManagementService.generateMasterKey).toHaveBeenCalled();
      expect(mockKeyManagementService.generateSigningKeys).toHaveBeenCalledWith(3);
    });

    it('should throw error for invalid signature scheme', async () => {
      const userId = 'user-123';
      const walletData = {
        name: 'Test Wallet',
        description: 'Test wallet description',
        signatureScheme: 'invalid-scheme',
        signers: []
      };

      await expect(walletService.createWallet(userId, walletData))
        .rejects
        .toThrow('Invalid signature scheme');
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/wallet.test.ts
import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestWallet } from '../helpers/testHelpers';

describe('Wallet API Integration Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser();
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'testpassword'
      });
    authToken = loginResponse.body.accessToken;
  });

  describe('POST /api/wallets', () => {
    it('should create a wallet successfully', async () => {
      const walletData = {
        name: 'Test Wallet',
        description: 'Test wallet description',
        signatureScheme: '2-of-3',
        signers: [
          { userId: testUser.id, role: 'owner' }
        ]
      };

      const response = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(walletData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(walletData.name);
      expect(response.body.data.signature_scheme).toBe(walletData.signatureScheme);
    });

    it('should return 400 for invalid wallet data', async () => {
      const invalidWalletData = {
        name: '',
        signatureScheme: 'invalid'
      };

      const response = await request(app)
        .post('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidWalletData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/wallets', () => {
    it('should return user wallets', async () => {
      const response = await request(app)
        .get('/api/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

## Deployment Configuration

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@db:5432/xrpl_manager
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - XRPL_PRIMARY_NODE=${XRPL_PRIMARY_NODE}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=xrpl_manager
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

This technical implementation guide provides the foundation for building the XRPL Multi-Sign Manager. The code examples demonstrate best practices for security, scalability, and maintainability while following the established architecture patterns. 