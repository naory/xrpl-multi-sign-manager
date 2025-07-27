import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  BelongsTo,
  HasMany
} from 'sequelize';
import sequelize from '../config/database';

interface WalletAttributes {
  id: string;
  name: string;
  description?: string;
  xrpl_address: string;
  master_key_id: string;
  signature_scheme: string;
  required_signatures: number;
  total_signers: number;
  status: string;
  balance_xrp: number;
  balance_usd: number;
  last_balance_update?: Date;
  created_at: Date;
  updated_at: Date;
}

interface WalletCreationAttributes extends Optional<WalletAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Wallet extends Model<WalletAttributes, WalletCreationAttributes> implements WalletAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public xrpl_address!: string;
  public master_key_id!: string;
  public signature_scheme!: string;
  public required_signatures!: number;
  public total_signers!: number;
  public status!: string;
  public balance_xrp!: number;
  public balance_usd!: number;
  public last_balance_update?: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Virtual getter for is active
  get isActive(): boolean {
    return this.status === 'active';
  }

  // Virtual getter for signature scheme description
  get signatureSchemeDescription(): string {
    return `${this.required_signatures}-of-${this.total_signers}`;
  }

  // Virtual getter for total balance in USD
  get totalBalanceUSD(): number {
    return this.balance_usd;
  }
}

Wallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    xrpl_address: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        len: [25, 35], // XRPL addresses are typically 25-35 characters
      },
    },
    master_key_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    signature_scheme: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['2-of-3', '3-of-5', '4-of-7', 'weighted']],
      },
    },
    required_signatures: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 32, // XRPL limit
      },
    },
    total_signers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 32, // XRPL limit
      },
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'suspended', 'deleted']],
      },
    },
    balance_xrp: {
      type: DataTypes.DECIMAL(20, 6),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    balance_usd: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    last_balance_update: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
  },
  {
    sequelize,
    tableName: 'wallets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['xrpl_address'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['master_key_id'],
      },
    ],
  }
);

export default Wallet; 