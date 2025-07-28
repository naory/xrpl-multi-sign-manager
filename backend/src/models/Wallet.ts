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
  user_id: string;
  name: string;
  description?: string;
  address: string;
  network: 'testnet' | 'mainnet' | 'devnet';
  signature_scheme: 'multi_sign' | 'weighted';
  quorum: number;
  is_imported: boolean;
  import_verified: boolean;
  status: 'active' | 'inactive' | 'suspended';
  last_balance_update?: Date;
  created_at: Date;
  updated_at: Date;
}

interface WalletCreationAttributes extends Optional<WalletAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Wallet extends Model<WalletAttributes, WalletCreationAttributes> implements WalletAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public description?: string;
  public address!: string;
  public network!: 'testnet' | 'mainnet' | 'devnet';
  public signature_scheme!: 'multi_sign' | 'weighted';
  public quorum!: number;
  public is_imported!: boolean;
  public import_verified!: boolean;
  public status!: 'active' | 'inactive' | 'suspended';
  public last_balance_update?: Date;
  public created_at!: Date;
  public updated_at!: Date;

  // Virtual getter for is active
  get isActive(): boolean {
    return this.status === 'active';
  }

  // Virtual getter for signature scheme description
  get signatureSchemeDescription(): string {
    return this.signature_scheme === 'weighted' ? 'Weighted Multi-Signature' : 'Multi-Signature';
  }

  // Virtual getter for network display name
  get networkDisplayName(): string {
    switch (this.network) {
      case 'mainnet':
        return 'Mainnet';
      case 'testnet':
        return 'Testnet';
      case 'devnet':
        return 'Devnet';
      default:
        return 'Unknown';
    }
  }

  // Virtual getter for import status
  get importStatus(): string {
    if (!this.is_imported) return 'Created';
    return this.import_verified ? 'Verified' : 'Pending Verification';
  }
}

Wallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(34),
      allowNull: false,
      unique: true,
      validate: {
        len: [25, 34], // XRPL addresses are 25-34 characters
        is: /^r[a-zA-Z0-9]{24,33}$/, // XRPL address format
      },
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
        max: 255, // XRPL limit for total weight
      },
    },
    is_imported: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    import_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
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
        fields: ['address'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['network'],
      },
      {
        fields: ['is_imported'],
      },
    ],
  }
);

export default Wallet; 