import { Model, DataTypes, UUIDV4 } from 'sequelize';
import { sequelize } from '../config/database';

export interface ExternalSignerAttributes {
  id: string;
  wallet_id: string;
  public_address: string;
  weight: number;
  nickname?: string;
  email?: string;
  wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
  is_active: boolean;
  added_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExternalSignerCreationAttributes extends Omit<ExternalSignerAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class ExternalSigner extends Model<ExternalSignerAttributes, ExternalSignerCreationAttributes> {
  public id!: string;
  public wallet_id!: string;
  public public_address!: string;
  public weight!: number;
  public nickname?: string;
  public email?: string;
  public wallet_type?: 'ledger' | 'xaman' | 'xumm' | 'other';
  public is_active!: boolean;
  public added_by!: string;
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
}

ExternalSigner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
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
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 255,
      },
    },
    nickname: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    wallet_type: {
      type: DataTypes.ENUM('ledger', 'xaman', 'xumm', 'other'),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
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
    tableName: 'external_signers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['wallet_id'],
      },
      {
        fields: ['public_address'],
      },
      {
        fields: ['wallet_id', 'is_active'],
      },
      {
        unique: true,
        fields: ['wallet_id', 'public_address'],
        name: 'unique_wallet_signer_address',
      },
    ],
  }
); 