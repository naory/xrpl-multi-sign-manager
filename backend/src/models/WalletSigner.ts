import {
  Model,
  DataTypes,
  Sequelize,
  Optional
} from 'sequelize';
import sequelize from '../config/database';

interface WalletSignerAttributes {
  id: string;
  wallet_id: string;
  user_id: string;
  signing_key_id?: string;
  role: string;
  weight: number;
  permissions: object;
  status: string;
  added_by?: string;
  created_at: Date;
  updated_at: Date;
}

interface WalletSignerCreationAttributes extends Optional<WalletSignerAttributes, 'id' | 'created_at' | 'updated_at'> {}

class WalletSigner extends Model<WalletSignerAttributes, WalletSignerCreationAttributes> implements WalletSignerAttributes {
  public id!: string;
  public wallet_id!: string;
  public user_id!: string;
  public signing_key_id?: string;
  public role!: string;
  public weight!: number;
  public permissions!: object;
  public status!: string;
  public added_by?: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Virtual getter for is active
  get isActive(): boolean {
    return this.status === 'active';
  }

  // Virtual getter for can sign
  get canSign(): boolean {
    return ['owner', 'signer'].includes(this.role) && this.isActive;
  }

  // Virtual getter for can view
  get canView(): boolean {
    return ['owner', 'signer', 'viewer'].includes(this.role) && this.isActive;
  }
}

WalletSigner.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wallets',
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    signing_key_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'signing_keys',
        key: 'id',
      },
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['owner', 'signer', 'viewer']],
      },
    },
    weight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 65535, // XRPL weight limit
      },
    },
    permissions: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'inactive', 'suspended']],
      },
    },
    added_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
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
    tableName: 'wallet_signers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['wallet_id', 'user_id'],
      },
      {
        fields: ['wallet_id'],
      },
      {
        fields: ['user_id'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['status'],
      },
    ],
  }
);

export default WalletSigner; 