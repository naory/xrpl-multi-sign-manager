import { Model, DataTypes, UUIDV4 } from 'sequelize';
import sequelize from '../config/database';

export interface WalletCreationRequestAttributes {
  id: string;
  user_id: string;
  wallet_name: string;
  wallet_description?: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  signature_scheme: 'multi_sign' | 'weighted';
  quorum: number;
  status: 'pending' | 'wallet_created' | 'blackhole_pending' | 'blackhole_completed' | 'signers_added' | 'completed' | 'failed';
  generated_address?: string;
  generated_master_key?: string;
  blackhole_transaction_hash?: string;
  blackhole_ledger_index?: number;
  signer_configuration?: Record<string, any>;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WalletCreationRequestCreationAttributes extends Omit<WalletCreationRequestAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class WalletCreationRequest extends Model<WalletCreationRequestAttributes, WalletCreationRequestCreationAttributes> {
  public id!: string;
  public user_id!: string;
  public wallet_name!: string;
  public wallet_description?: string;
  public network!: 'testnet' | 'mainnet' | 'devnet';
  public signature_scheme!: 'multi_sign' | 'weighted';
  public quorum!: number;
  public status!: 'pending' | 'wallet_created' | 'blackhole_pending' | 'blackhole_completed' | 'signers_added' | 'completed' | 'failed';
  public generated_address?: string;
  public generated_master_key?: string;
  public blackhole_transaction_hash?: string;
  public blackhole_ledger_index?: number;
  public signer_configuration?: Record<string, any>;
  public error_message?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual getters
  get isCompleted(): boolean {
    return this.status === 'completed';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isInProgress(): boolean {
    return !this.isCompleted && !this.isFailed;
  }

  get progressPercentage(): number {
    switch (this.status) {
      case 'pending':
        return 0;
      case 'wallet_created':
        return 20;
      case 'blackhole_pending':
        return 40;
      case 'blackhole_completed':
        return 60;
      case 'signers_added':
        return 80;
      case 'completed':
        return 100;
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  get statusDescription(): string {
    switch (this.status) {
      case 'pending':
        return 'Initializing wallet creation';
      case 'wallet_created':
        return 'Wallet generated, preparing blackhole transaction';
      case 'blackhole_pending':
        return 'Blackhole transaction submitted';
      case 'blackhole_completed':
        return 'Master key blackholed, adding signers';
      case 'signers_added':
        return 'Signers configured, finalizing setup';
      case 'completed':
        return 'Multi-signature wallet ready';
      case 'failed':
        return 'Setup failed';
      default:
        return 'Unknown status';
    }
  }
}

WalletCreationRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    wallet_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    wallet_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    network: {
      type: DataTypes.ENUM('testnet', 'mainnet', 'devnet'),
      allowNull: false,
      defaultValue: 'testnet',
    },
    signature_scheme: {
      type: DataTypes.ENUM('multi_sign', 'weighted'),
      allowNull: false,
      defaultValue: 'weighted',
    },
    quorum: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 255,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'wallet_created', 'blackhole_pending', 'blackhole_completed', 'signers_added', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    generated_address: {
      type: DataTypes.STRING(34),
      allowNull: true,
      validate: {
        len: [25, 34],
        is: /^r[a-zA-Z0-9]{24,33}$/,
      },
    },
    generated_master_key: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    blackhole_transaction_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    blackhole_ledger_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    signer_configuration: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'wallet_creation_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['generated_address'],
      },
    ],
  }
); 