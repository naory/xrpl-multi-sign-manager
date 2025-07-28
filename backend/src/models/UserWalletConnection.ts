import { Model, DataTypes, UUIDV4 } from 'sequelize';
import sequelize from '../config/database';

export interface UserWalletConnectionAttributes {
  id: string;
  user_id: string;
  public_address: string;
  wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
  nickname?: string;
  is_primary: boolean;
  is_verified: boolean;
  verification_signature?: string;
  verification_message?: string;
  verification_timestamp?: Date;
  connection_metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserWalletConnectionCreationAttributes extends Omit<UserWalletConnectionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class UserWalletConnection extends Model<UserWalletConnectionAttributes, UserWalletConnectionCreationAttributes> {
  public id!: string;
  public user_id!: string;
  public public_address!: string;
  public wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
  public nickname?: string;
  public is_primary!: boolean;
  public is_verified!: boolean;
  public verification_signature?: string;
  public verification_message?: string;
  public verification_timestamp?: Date;
  public connection_metadata?: Record<string, any>;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Virtual getters
  get displayName(): string {
    return this.nickname || this.public_address.slice(0, 8) + '...' + this.public_address.slice(-8);
  }

  get isHardwareWallet(): boolean {
    return this.wallet_type === 'ledger';
  }

  get isMobileWallet(): boolean {
    return this.wallet_type === 'xaman' || this.wallet_type === 'xumm';
  }

  get verificationStatus(): string {
    if (!this.is_verified) return 'Unverified';
    return this.verification_timestamp ? 'Verified' : 'Pending';
  }
}

UserWalletConnection.init(
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
    public_address: {
      type: DataTypes.STRING(34),
      allowNull: false,
      validate: {
        len: [25, 34], // XRPL addresses are 25-34 characters
        is: /^r[a-zA-Z0-9]{24,33}$/, // XRPL address format
      },
    },
    wallet_type: {
      type: DataTypes.ENUM('ledger', 'xaman', 'xumm', 'other'),
      allowNull: true,
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verification_signature: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verification_timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    connection_metadata: {
      type: DataTypes.JSONB,
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
    tableName: 'user_wallet_connections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['public_address'],
      },
      {
        fields: ['user_id', 'is_primary'],
      },
      {
        fields: ['user_id', 'is_verified'],
      },
      {
        unique: true,
        fields: ['user_id', 'public_address'],
        name: 'unique_user_wallet_connection',
      },
      {
        unique: true,
        fields: ['user_id', 'is_primary'],
        name: 'unique_user_primary_wallet',
        where: {
          is_primary: true,
        },
      },
    ],
  }
); 